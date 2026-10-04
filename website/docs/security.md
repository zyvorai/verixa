---
sidebar_position: 3
---

# Security

Report vulnerabilities privately to **security@zyvor.dev** or through
[GitHub private vulnerability reporting](https://github.com/zyvorai/verixa/security/advisories/new).

## Authentication

- A token is required for every API read and write. One is generated per start, or set with
  `VERIXA_TOKEN` (8+ characters).
- The console exchanges it for an HttpOnly, SameSite=Strict session cookie (Secure over HTTPS,
  12 h). The cookie holds an expiry plus an HMAC keyed by the token, never the token itself.
- **`Admin@321` is a public demo default.** Use a long random token on anything shared.

## Network

- Unrecognized `Host` headers get `403` (DNS-rebinding protection), and cross-origin browser
  requests are refused.
- A strict Content-Security-Policy blocks inline scripts and styles, and framing is denied.
- JSON bodies are bounded, chunked bodies are refused, and sockets time out.
- The default listener is loopback. Remote deploys use HTTPS and an explicit host allow-list.

There is no distributed rate limiter, SSO, tenant boundary or isolation for custom Python
adapters. Prefer a private network or an SSH tunnel to direct internet exposure.

## Data

Only optional model calls leave the process. Remote model endpoints require HTTPS, and
redirects that carry an `Authorization` header are rejected. Keys come from the environment and
never appear in exports. Scenarios and exports can contain sensitive tool inputs, so review them
before sharing. SQLite is not encrypted at rest.
