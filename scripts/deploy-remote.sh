#!/usr/bin/env bash
# Verixa — remote deploy (SSH + rsync, then container / K3s+Helm / systemd)
#
# Profiles (one runs at a time; starting one stops the others):
#   default / --container  Build the image on the host, run it with docker or podman
#   --k3s                  Build + import into k3s containerd, Helm install (NodePort)
#   --systemd              python3 -m verixa as a systemd service (host Python 3.11+)
#
# Usage:
#   ./scripts/deploy-remote.sh user@10.0.1.5
#   ./scripts/deploy-remote.sh 10.0.1.5 user --k3s
#   ./scripts/deploy-remote.sh 10.0.1.5 user --verify-only
#
# The console is served over HTTPS (self-signed, kept in ~/.verixa/tls) on port
# VERIXA_PORT (default 30878). Sign in as admin / Admin@321: VERIXA_TOKEN defaults to
# Admin@321 so the demo login works; set VERIXA_TOKEN to rotate it, then sign in as
# admin with that value as the password.
#
# VERIXA_REMOTE_SUBDIR overrides the remote checkout, relative to $HOME
# (default .deployments/verixa). VERIXA_DEMO=0 skips seeding demo runs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROFILE="container"
DRY_RUN=false
VERIFY_ONLY=false
TARGET=""
POSITIONAL=()
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --container) PROFILE="container"; shift ;;
    --k3s) PROFILE="k3s"; shift ;;
    --systemd) PROFILE="systemd"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --verify-only) VERIFY_ONLY=true; shift ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

if [[ ${#POSITIONAL[@]} -eq 1 ]]; then
  TARGET="${POSITIONAL[0]}"
elif [[ ${#POSITIONAL[@]} -eq 2 ]]; then
  # ./scripts/deploy-remote.sh HOST USER
  if [[ "${POSITIONAL[0]}" == *@* ]]; then
    TARGET="${POSITIONAL[0]}"
  elif [[ "${POSITIONAL[1]}" == *@* ]]; then
    TARGET="${POSITIONAL[1]}"
  else
    TARGET="${POSITIONAL[1]}@${POSITIONAL[0]}"
  fi
fi
if [[ -z "${TARGET}" ]]; then
  echo "usage: $0 user@host [--container|--k3s|--systemd] [--dry-run] [--verify-only]" >&2
  echo "   or: $0 HOST USER [--container|--k3s|--systemd]" >&2
  exit 2
fi
TARGET_HOST="${TARGET#*@}"

TOKEN_LOCAL="${VERIXA_TOKEN:-Admin@321}"
if [[ ${#TOKEN_LOCAL} -lt 8 ]]; then
  echo "VERIXA_TOKEN must be at least 8 characters" >&2
  exit 2
fi
PORT_LOCAL="${VERIXA_PORT:-30878}"
DEMO_LOCAL="${VERIXA_DEMO:-1}"
IMAGE="ghcr.io/zyvorai/verixa:0.1.0"

log() { printf '[verixa-deploy] %s\n' "$*"; }
ssh_host() { ssh "${SSH_OPTS[@]}" "$TARGET" "$@"; }

if $VERIFY_ONLY; then
  ssh_host "PORT=${PORT_LOCAL} bash -s" <<'EOF'
set -euo pipefail
docker ps --filter name=^verixa$ --format 'container(docker): {{.Status}}' 2>/dev/null || true
podman ps --filter name=^verixa$ --format 'container(podman): {{.Status}}' 2>/dev/null || true
systemctl is-active verixa >/dev/null 2>&1 && echo "systemd: active" || true
sudo k3s kubectl -n verixa-system get deploy,svc,pods 2>/dev/null || true
curl -skf "https://127.0.0.1:${PORT}/healthz"; echo
EOF
  exit 0
fi

REMOTE_HOME="$(ssh_host 'printf %s "$HOME"')"
REMOTE_DIR="${REMOTE_HOME}/${VERIXA_REMOTE_SUBDIR:-.deployments/verixa}"

log "sync → ${TARGET}:${REMOTE_DIR} (profile: ${PROFILE})"
if ! $DRY_RUN; then
  ssh_host "mkdir -p ${REMOTE_DIR}"
  rsync -az --delete \
    --exclude '.git' --exclude '.verixa' --exclude 'artifacts' --exclude 'node_modules' \
    --exclude '__pycache__' --exclude '*.egg-info' --exclude '.DS_Store' --exclude '.cursor' \
    "${ROOT}/" "${TARGET}:${REMOTE_DIR}/"
fi

remote_script=$(cat <<EOF
set -euo pipefail
cd "${REMOTE_DIR}"
PROFILE="${PROFILE}"
PORT="${PORT_LOCAL}"
DEMO="${DEMO_LOCAL}"
IMAGE="${IMAGE}"
TARGET_HOST="${TARGET_HOST}"
TOKEN=\$(cat <<'TOKENEOF'
${TOKEN_LOCAL}
TOKENEOF
)
CFG="\$HOME/.verixa"
HOST_IP="\$(hostname -I | awk '{print \$1}')"
mkdir -p "\$CFG/tls" "\$CFG/data"
chmod 700 "\$CFG"

used_pct="\$(df -P / | awk 'NR==2 {gsub("%","",\$5); print \$5}')"
if [[ "\$used_pct" -ge "\${VERIXA_DEPLOY_WARN_DISK_PCT:-90}" ]]; then
  echo "warning: / is \${used_pct}% full; image builds and k3s image GC may fail" >&2
fi

# One self-signed cert reused across deploys and profiles so clients can pin it.
if [[ ! -s "\$CFG/tls/tls.crt" ]]; then
  openssl req -x509 -nodes -days 3650 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
    -keyout "\$CFG/tls/tls.key" -out "\$CFG/tls/tls.crt" -subj "/CN=verixa/O=Zyvor AI Labs" \
    -addext "subjectAltName=DNS:verixa,DNS:localhost,IP:127.0.0.1,IP:\$HOST_IP" 2>/dev/null
fi
# The container runs as uid/gid 10001; the host user keeps ownership.
sudo chgrp 10001 "\$CFG/tls/tls.key" "\$CFG/tls/tls.crt"
chmod 640 "\$CFG/tls/tls.key"; chmod 644 "\$CFG/tls/tls.crt"
chmod 711 "\$CFG" "\$CFG/tls"

ALLOWED="\$HOST_IP:\$PORT,127.0.0.1:\$PORT,localhost:\$PORT"
if [[ "\$TARGET_HOST" != "\$HOST_IP" ]]; then ALLOWED="\$ALLOWED,\$TARGET_HOST:\$PORT"; fi
if [[ -n "\${VERIXA_PUBLIC_HOST:-}" ]]; then ALLOWED="\$ALLOWED,\$VERIXA_PUBLIC_HOST"; fi

umask 077
cat > "\$CFG/env" <<ENVEOF
# Written by deploy-remote.sh
VERIXA_TOKEN=\$TOKEN
VERIXA_ALLOWED_HOSTS=\$ALLOWED
VERIXA_TLS_CERT=\$CFG/tls/tls.crt
VERIXA_TLS_KEY=\$CFG/tls/tls.key
VERIXA_URL=https://\$HOST_IP:\$PORT
ENVEOF
umask 022

DEMO_FLAG=""; [[ "\$DEMO" == "1" ]] && DEMO_FLAG="--demo"

pick_runtime() {
  if docker info >/dev/null 2>&1; then echo docker
  elif command -v podman >/dev/null 2>&1; then echo podman
  else echo "docker or podman required" >&2; exit 1; fi
}

stop_container() {
  local runtime
  for runtime in docker podman; do
    command -v \$runtime >/dev/null 2>&1 && \$runtime rm -f verixa >/dev/null 2>&1 || true
  done
}
stop_systemd() {
  if systemctl list-unit-files verixa.service >/dev/null 2>&1; then
    sudo systemctl disable --now verixa >/dev/null 2>&1 || true
  fi
}
stop_k3s() {
  if command -v helm >/dev/null 2>&1 && sudo test -r /etc/rancher/k3s/k3s.yaml; then
    sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm uninstall verixa -n verixa-system >/dev/null 2>&1 || true
  fi
}

deploy_container() {
  stop_systemd; stop_k3s
  local rt; rt="\$(pick_runtime)"
  echo "Building \$IMAGE with \$rt..."
  \$rt build -q -t "\$IMAGE" .
  stop_container
  \$rt run -d --name verixa --restart unless-stopped \
    -p "\$PORT:8788" \
    -v verixa-data:/data \
    -v "\$CFG/tls:/tls:ro" \
    -e VERIXA_TOKEN="\$TOKEN" \
    -e VERIXA_ALLOWED_HOSTS="\$ALLOWED" \
    -e VERIXA_TLS_CERT=/tls/tls.crt -e VERIXA_TLS_KEY=/tls/tls.key \
    --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true \
    "\$IMAGE" python3 -m verixa serve --host 0.0.0.0 --port 8788 \$DEMO_FLAG >/dev/null
}

deploy_systemd() {
  stop_container; stop_k3s
  python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' || { echo "Python 3.11+ required for --systemd" >&2; exit 1; }
  sudo tee /etc/systemd/system/verixa.service >/dev/null <<UNIT
[Unit]
Description=Verixa agent rehearsal console
After=network-online.target
Wants=network-online.target

[Service]
User=\$(id -un)
Group=\$(id -gn)
WorkingDirectory=\$PWD
EnvironmentFile=\$CFG/env
Environment=PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ExecStart=/usr/bin/env python3 -m verixa --db \$CFG/data/state.db serve --host 0.0.0.0 --port \$PORT \$DEMO_FLAG
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=\$CFG/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable verixa >/dev/null 2>&1
  sudo systemctl restart verixa
}

deploy_k3s() {
  stop_container; stop_systemd
  if ! command -v k3s >/dev/null 2>&1; then
    echo "Installing k3s..."
    curl -sfL https://get.k3s.io | sudo sh -s - --write-kubeconfig-mode 600
  fi
  if ! command -v helm >/dev/null 2>&1; then
    echo "Installing helm..."
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | sudo bash
  fi
  mkdir -p "\$HOME/.kube"
  sudo cat /etc/rancher/k3s/k3s.yaml > "\$HOME/.kube/verixa-k3s.yaml"
  chmod 600 "\$HOME/.kube/verixa-k3s.yaml"
  export KUBECONFIG="\$HOME/.kube/verixa-k3s.yaml"

  local rt; rt="\$(pick_runtime)"
  echo "Building \$IMAGE with \$rt and importing into k3s..."
  \$rt build -q -t "\$IMAGE" .
  \$rt save "\$IMAGE" | sudo k3s ctr images import - >/dev/null

  kubectl create namespace verixa-system --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl -n verixa-system create secret generic verixa-auth --from-literal=token="\$TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl -n verixa-system create secret tls verixa-tls --cert="\$CFG/tls/tls.crt" --key="\$CFG/tls/tls.key" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  helm upgrade --install verixa ./helm/verixa \
    --namespace verixa-system \
    --set image.repository="\${IMAGE%:*}" --set image.tag="\${IMAGE##*:}" \
    --set tls.existingSecret=verixa-tls \
    --set "allowedHosts={\$ALLOWED}" \
    --set demo=\$([[ "\$DEMO" == "1" ]] && echo true || echo false) \
    --set service.nodePort="\$PORT" \
    --wait --timeout 300s >/dev/null

  # The tag is fixed, so the pod template never changes between deploys; force a
  # restart so the freshly imported image is what runs.
  kubectl -n verixa-system rollout restart deployment/verixa >/dev/null
  if ! kubectl -n verixa-system rollout status deployment/verixa --timeout=300s; then
    # Image GC on a full disk can remove the imported image before the pod starts.
    \$rt save "\$IMAGE" | sudo k3s ctr images import - >/dev/null
    kubectl -n verixa-system delete pod -l app.kubernetes.io/name=verixa >/dev/null
    kubectl -n verixa-system rollout status deployment/verixa --timeout=300s || { kubectl -n verixa-system get pods -o wide; exit 1; }
  fi
}

case "\$PROFILE" in
  container) deploy_container ;;
  systemd) deploy_systemd ;;
  k3s) deploy_k3s ;;
esac

healthy() { curl -skf "https://127.0.0.1:\$PORT/healthz" || curl -skf "https://\$HOST_IP:\$PORT/healthz"; }
for i in \$(seq 1 60); do
  if healthy >/dev/null; then break; fi
  sleep 1
done
healthy || { echo "health check failed" >&2; exit 1; }
echo
echo "VERIXA_URL=https://\$HOST_IP:\$PORT"
echo "Sign in: admin / (VERIXA_TOKEN; default Admin@321)"
EOF
)

if $DRY_RUN; then
  log "dry-run remote script:"
  echo "$remote_script" | sed "s/${TOKEN_LOCAL//\//\\/}/<redacted>/g"
  exit 0
fi

ssh_host 'bash -s' <<<"$remote_script"
log "done — open https://${TARGET_HOST}:${PORT_LOCAL}"
