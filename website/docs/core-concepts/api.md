---
sidebar_position: 4
---

# HTTP API

Send `Authorization: Bearer TOKEN` on every `/api/v1/` request, or a valid `verixa_session`
cookie. POST bodies use `Content-Type: application/json`, up to 256000 bytes.

| Method | Route | Body / response |
|---|---|---|
| GET | `/healthz` | Public status and version |
| POST | `/api/v1/session` | `{token}` → HttpOnly session cookie (12 h); 401 on a wrong token |
| GET | `/api/v1/session` | `{authenticated, ttl_seconds, tls}`; no auth required |
| DELETE | `/api/v1/session` | Clears the cookie |
| GET | `/api/v1/scenarios` | All validated fixtures |
| POST | `/api/v1/scenarios` | Scenario object; create or update by id; 201 |
| GET | `/api/v1/runs` | Latest 100 runs, newest first |
| GET | `/api/v1/runs/{id}` | A full run, or 404 |
| POST | `/api/v1/runs` | `{scenario_id, agent?, actions?}`; reference / regression / replay; 201 |
| POST | `/api/v1/compare` | `{baseline_id, candidate_id}` → PASS/BLOCK and regressions |

Errors: 400 input, 401 unauthorized, 403 Host or Origin denied, 413 oversized body,
415 unsupported content type. A failing rehearsal is a valid created run (`201` with
`verdict: FAIL`), not an HTTP error.

```bash
curl http://127.0.0.1:8788/api/v1/runs \
  -H "Authorization: Bearer $VERIXA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"refund-commit-timeout","agent":"reference"}'
```
