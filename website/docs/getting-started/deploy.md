---
sidebar_position: 3
---

# Deploy to a server

`scripts/deploy-remote.sh` uses SSH and rsync. The target needs `sudo`, `openssl`, and
docker/podman, k3s, or Python 3.11+, depending on the profile.

```bash
./scripts/deploy-remote.sh 10.0.1.5 user               # container (default)
./scripts/deploy-remote.sh 10.0.1.5 user --k3s         # K3s + Helm, NodePort
./scripts/deploy-remote.sh 10.0.1.5 user --systemd     # host python3 as a service
./scripts/deploy-remote.sh 10.0.1.5 user --verify-only # status + health
./scripts/deploy-remote.sh 10.0.1.5 user --dry-run     # print the remote script, token redacted
```

Then open `https://10.0.1.5:30878` and sign in as **admin / Admin@321**.

## What the script does

1. Syncs the tree to `~/.deployments/verixa`.
2. Creates one self-signed TLS certificate in `~/.verixa/tls` and reuses it on later deploys.
3. Writes `~/.verixa/env` (mode 600) with the token, accepted hosts and TLS paths.
4. Stops whichever other profile is running, so only one owns the port.
5. Starts the selected profile and waits for `/healthz` over HTTPS.

| Profile | How it runs | State |
|---|---|---|
| container | Image built on the host; read-only root, all capabilities dropped, `no-new-privileges`, `--restart unless-stopped` | `verixa-data` volume |
| k3s | Image imported into k3s containerd; [Helm chart](https://github.com/zyvorai/verixa/tree/main/helm/verixa) with token and TLS Secrets and a NodePort; forced rollout restart | PVC (removed on switch) |
| systemd | `verixa.service` as the deploy user, `ProtectSystem=strict` | `~/.verixa/data` |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VERIXA_TOKEN` | `Admin@321` | API key and admin password; **change it for shared hosts** |
| `VERIXA_PORT` | `30878` | Host / NodePort port |
| `VERIXA_DEMO` | `1` | Seed demo runs into an empty database |
| `VERIXA_PUBLIC_HOST` | — | Extra accepted Host header (`name:port`) when using DNS |
| `VERIXA_REMOTE_SUBDIR` | `.deployments/verixa` | Remote checkout, relative to `$HOME` |

## Server flags

The server only answers its bound host, localhost and 127.0.0.1 with the bound port; anything
else gets `403`. This is DNS-rebinding protection. Add names with `--allowed-host host:port` or
`VERIXA_ALLOWED_HOSTS`. Serve HTTPS directly with `--tls-cert` / `--tls-key`.

```bash
VERIXA_TOKEN="$(openssl rand -hex 24)" python3 -m verixa serve --host 0.0.0.0 --port 8788 \
  --allowed-host verixa.internal:8788 --tls-cert cert.pem --tls-key key.pem
```

## Docker Compose

```bash
docker compose up --build
```

Compose binds the console to localhost. Read the generated token from the container logs.
