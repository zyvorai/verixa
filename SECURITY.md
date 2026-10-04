# Security

Report vulnerabilities privately to security@zyvor.dev or through
[GitHub private vulnerability reporting](https://github.com/zyvorai/verixa/security/advisories/new).
Do not include provider API keys, customer traces or private scenario content in public issues.

## Authentication

The API requires a token: a random one is generated per start, or set `VERIXA_TOKEN` (at least
8 characters). Reads as well as writes are authenticated. `/healthz`, `GET /api/v1/session` and
static assets are public.

The console signs in as `admin` and exchanges the token for an HttpOnly, SameSite=Strict session
cookie (Secure over HTTPS, 12 hours). The cookie value is an expiry plus an HMAC keyed by the token.
The token is never stored in browser storage. Rotating the token invalidates all sessions.

**`Admin@321` is a public demo default** used by `scripts/deploy-remote.sh`. It is fine for a lab,
but set a long random `VERIXA_TOKEN` for anything reachable by others.

## Network exposure

The server rejects unrecognized Host values (DNS-rebinding protection) and cross-origin browser
requests. It uses a restrictive CSP and bounded JSON bodies. The default listener is loopback.
Remote deploys serve HTTPS with a self-signed certificate and list their accepted hosts explicitly.

There is no distributed rate limiter, SSO, tenant boundary, or resource isolation for custom
Python adapters. Prefer a private network or an SSH tunnel over direct internet exposure.

## Data

Only optional model calls leave the process. Remote model endpoints require HTTPS;
Authorization-bearing redirects are rejected. Keys come from environment variables, are not
embedded in exports, and exceptions from adapters are recorded only as exception types.

Scenarios and run exports may contain sensitive tool inputs. Review and redact before sharing.
SQLite and exports are not encrypted at rest.
