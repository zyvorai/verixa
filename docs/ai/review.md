# AI review (verixa)

_Generated 2026-10-20 by claude-opus-5-5 from a snapshot of tracked sources; verify before acting._

# Code review: verixa

## Summary

Verixa is a zero-dependency Python 3.11+ tool for "agent rehearsal". It runs an agent adapter's proposed tool calls against a simulated world (orders, refunds, approvals, tickets, deployments), with policy enforcement and fault injection. It then evaluates final-state assertions and gates releases with exit code 3.

It ships three entry points that share one engine (`verixa/engine.py`) and one SQLite store:

- a CLI (`verixa/__main__.py`);
- an authenticated HTTP API and console (`verixa/server.py`, `verixa/static/`);
- deployment tooling (Docker, Helm, `scripts/deploy-remote.sh`) plus a Docusaurus marketing/docs site.

## Bugs and correctness risks

- **One approval authorizes repeated refunds, contradicting the README** (`verixa/engine.py`, `World.call`).
  - The over-limit check is `any(x["order_id"] == ... and x["amount_cents"] == ... and x["approved"] ...)`.
  - Approvals are never consumed. A single approval for (order, amount) authorizes any number of refunds of that amount, limited only by the order balance.
  - Example: a 25000-cent order with one approval for 12000 allows two 12000-cent refunds under new keys.
  - README states "Approving one refund never authorizes another." Either consume or mark approvals on use, or change the claim.
- **`verify` only checks the event chain, not the run's verdict** (`__main__.py` `verify`, `engine.verify_events`).
  - `verdict`, `assertions`, `final`, `scenario_hash` and `initial` are outside the chain. A FAIL export can be edited to `"verdict": "PASS"` and still print "Event chain intact".
  - An empty `events` list also verifies as intact.
  - The docs say the chain is not a signature, but "verify artifacts/evidence.json" reads as verifying the evidence.
  - Fix options: include a final digest of the run record, or re-evaluate assertions from the chain.
- **Bundled scenarios are never upgraded, and can be overwritten** (`verixa/store.py`).
  - `INSERT OR IGNORE` at startup means existing databases keep old bundled definitions after a release.
  - `save_scenario` (CLI `import` and `POST /api/v1/scenarios`) can silently overwrite bundled IDs such as `refund-happy`.
  - `run all` uses `store.scenarios()`, so imported scenarios also change "the reference suite" that CI relies on.
- **Assertion paths cannot reach list collections** (`engine.evaluate`).
  - Traversal only descends dicts, so `refunds`, `approvals` and `violations` are unaddressable (e.g. `refunds.0.amount_cents` always fails as "missing").
  - `website/docs/core-concepts/scenarios.md` lists `refunds` as an addressable path.
- **`eq` is type-strict between int and float** (`evaluate`). `type(actual) is type(a["value"])` makes `8000 == 8000.0` fail. This is surprising for JSON-authored scenarios.
- **`expired_credentials` is a one-shot fault.** It returns `retryable: False` for one invocation only; the next call succeeds. An agent that ignores the flag and retries "recovers". That may be intended, but it is not documented.
- **Denied calls still consume fault occurrences.** `counts[tool]` increments before the policy check, so a denied call uses up the fault configured for that occurrence and the fault never fires.
- **Unhandled storage errors drop connections** (`server.py`).
  - `do_GET` has no `try`. `do_POST` catches only `TypeError`, `ValueError`, `KeyError` and `UnicodeError`.
  - `sqlite3.OperationalError` (e.g. "database is locked" after the 10 s timeout) falls through to `handle_error`, which is a silent `pass`. The client sees a reset with no 5xx and nothing is logged.
- **SQLite connections are never closed** (`store.py`). `with sqlite3.connect(...) as db` only commits; it does not close. This relies on CPython refcounting for cleanup.
- **Empty bodies get the wrong status** (`server.py`). An empty POST body returns 413 ("Body must be 
