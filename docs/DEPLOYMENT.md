# Deployment

Local Python: `python3 -m verixa serve --demo`. Persistent state defaults to `.verixa/state.db`.
Set `VERIXA_DB` or global `--db PATH`. Set `VERIXA_TOKEN` (at least 8 characters) for a stable,
private token; otherwise each server start generates one. Store tokens outside the repository.

Install a command with `pip install --no-deps .`, then run `verixa serve`. You can also run
directly from the source directory without installing.

## Signing in

The console opens on a sign-in screen. Username `admin`; password `Admin@321` when the server
token is the demo default `Admin@321`, or the server token itself for any other value. The browser
probes the API with that bearer, then exchanges it at `POST /api/v1/session` for a
`verixa_session` cookie (HttpOnly, SameSite=Strict, Secure over HTTPS, 12 hours). The cookie holds
an expiry and an HMAC keyed by the token, never the token, and nothing is kept in browser storage.
Rotating `VERIXA_TOKEN` invalidates every session. Scripts and CI keep using
`Authorization: Bearer <token>`. Like Netra, this is a single shared secret with a friendly
login in front of it, not a per-user account system.

## Remote deploy

```bash
./scripts/deploy-remote.sh 10.0.1.5 user               # container (default)
./scripts/deploy-remote.sh 10.0.1.5 user --k3s         # K3s + Helm, NodePort
./scripts/deploy-remote.sh 10.0.1.5 user --systemd     # host python3 as a service
./scripts/deploy-remote.sh 10.0.1.5 user --verify-only
./scripts/deploy-remote.sh 10.0.1.5 user --dry-run     # print the remote script (token redacted)
```

The script rsyncs the tree to `~/.deployments/verixa`, then:

- Generates one self-signed TLS certificate in `~/.verixa/tls` and reuses it across deploys.
- Writes `~/.verixa/env` (mode 600).
- Serves `https://<host>:30878`.
- Stops whichever other profile was running, so only one owns the port.

| Variable | Default | Purpose |
|---|---|---|
| `VERIXA_TOKEN` | `Admin@321` | API key; the admin password |
| `VERIXA_PORT` | `30878` | Host / NodePort port |
| `VERIXA_DEMO` | `1` | Seed demo runs on an empty database |
| `VERIXA_PUBLIC_HOST` | — | Extra accepted Host header (`name:port`) behind DNS |
| `VERIXA_REMOTE_SUBDIR` | `.deployments/verixa` | Remote checkout, relative to `$HOME` |

- **Container**: builds `ghcr.io/zyvorai/verixa:0.1.0` with docker (podman fallback). It runs with a read-only root, all capabilities dropped and `--restart unless-stopped`. State lives in the `verixa-data` volume.
- **K3s**: imports the image into k3s containerd and installs [helm/verixa](../helm/verixa) in `verixa-system` with token and TLS Secrets. It then forces a rollout restart, because the tag is fixed. Switching away uninstalls the release, including its PVC.
- **systemd**: installs `verixa.service`, running as the deploy user with `ProtectSystem=strict`. State is kept in `~/.verixa/data`.

## Host and TLS options

The server accepts its bound host, localhost and 127.0.0.1 with the bound port. Add more names
with `--allowed-host host:port` or `VERIXA_ALLOWED_HOSTS=a:port,b:port`; anything else gets 403
(DNS-rebinding protection). Serve HTTPS directly with `--tls-cert` / `--tls-key`
(`VERIXA_TLS_CERT` / `VERIXA_TLS_KEY`). SSO is not supported.

## Docker Compose

Docker Compose binds port 8788 to the host loopback. Use `docker compose logs` to obtain
the generated token. The named data volume survives restart. To seed demo runs, override
the command with `python3 -m verixa serve --host 0.0.0.0 --demo`.

Back up the SQLite database while the server is stopped, or use SQLite's backup API.
There is no automatic pruning of run history in 0.1; the console lists only the most recent
100 runs. Export specific older runs through their saved IDs.
