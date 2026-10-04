---
sidebar_position: 2
---

# The console

![Sign in](/07-login.png)

## Signing in

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `Admin@321` when the server token is the demo default, otherwise the server token |

The login screen shows the host you are connecting to. The browser probes the API with the
bearer, then exchanges it at `POST /api/v1/session` for a `verixa_session` cookie. The cookie is
HttpOnly and SameSite=Strict, Secure over HTTPS, and lasts 12 hours. Its value is an expiry plus
an HMAC keyed by the token, never the token itself, and nothing is written to browser storage.
Rotating `VERIXA_TOKEN` signs everyone out. A `401` at any point returns you to the login screen.

Like Netra, Verixa has one shared API secret with a friendly login in front of it, not a
per-user account system. Scripts and CI keep using `Authorization: Bearer <token>`.

## Pages

| Page | What it does |
|---|---|
| Overview | Pass-rate ring, recorded runs, the propose → rehearse → verify flow, recent runs, verdict trend by domain, one-click reference suite |
| Rehearsals | Search and verdict filter; the evidence drawer shows outcome checks, an action timeline with arguments, results and state diffs, export and trace replay |
| Scenarios | Ten bundled fixtures with tool and fault tags; JSON import, and an editor with line numbers and server validation |
| Fault studio | Pick a scenario, tool, failure mode, invocation and scripted agent; a live preview shows the injected fault before you run it |
| Compare | Baseline and candidate summaries side by side, then a release gate: allowed or blocked, with regressed assertions and deltas |
| Settings | Host, TLS and session details, sign out, copyable API, model and CI snippets |

Light and dark themes follow the moon/sun toggle and persist per browser. Layouts adapt down
to phone width.

![Evidence drawer](/02-evidence.png)
