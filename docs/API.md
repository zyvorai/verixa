# API v1

Send `Authorization: Bearer TOKEN` on every `/api/v1/` request, or a valid `verixa_session` cookie.

| Route | Purpose |
|---|---|
| `POST /api/v1/session` `{"token": "..."}` | Exchange the token for an HttpOnly session cookie (12 h); 401 on a wrong token |
| `GET /api/v1/session` | `{"authenticated": bool, "ttl_seconds": 43200, "tls": bool}`; no auth required |
| `DELETE /api/v1/session` | Clear the session cookie |

Use `Content-Type: application/json` for POST. Maximum body: 256000 bytes.

| Method | Route | Body / response |
|---|---|---|
| GET | `/healthz` | Public status and version |
| GET | `/api/v1/scenarios` | Complete validated fixtures |
| POST | `/api/v1/scenarios` | Scenario object; create/update by id; 201 |
| GET | `/api/v1/runs` | Latest 100 runs, newest first |
| GET | `/api/v1/runs/{id}` | Full persisted run or 404 |
| POST | `/api/v1/runs` | `{scenario_id, agent?}`; reference/regression/replay; 201 |
| POST | `/api/v1/compare` | `{baseline_id, candidate_id}`; PASS/BLOCK and regressions |

For replay, send `agent: "replay"` and `actions: [{tool, args}, ...]`.
The model adapter is CLI-only. Input errors: 400; unauthorized: 401; origin/Host denied:
403; oversized body: 413; unsupported content type: 415. A failing rehearsal is a valid
created run (201 with `verdict: FAIL`), not an HTTP error.

```bash
curl http://127.0.0.1:8788/api/v1/runs \
  -H "Authorization: Bearer $VERIXA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"refund-commit-timeout","agent":"reference"}'
```

Scenario shape and example: [examples/refund.json](../examples/refund.json).
Allowed fields are validated strictly. Assertion paths address final state or `metrics`;
operations are `eq`, `lte`, `gte`. Policy denials are observable violations even if their
side effects are blocked. Include a `metrics.violations == 0` assertion when required.
