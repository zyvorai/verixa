<div align="center">

# Verixa

### Rehearse every action. Ship with evidence.

**Stateful AI agent rehearsal and outcome verification.**

Test an agent's tool calls against simulated systems. Inject failures, verify final state,
compare versions, and block releases on regressions.

[![CI](https://github.com/zyvorai/verixa/actions/workflows/ci.yml/badge.svg)](https://github.com/zyvorai/verixa/actions/workflows/ci.yml)
[![Docs](https://github.com/zyvorai/verixa/actions/workflows/pages.yml/badge.svg)](https://zyvorai.github.io/verixa/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](pyproject.toml)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)](pyproject.toml)

[Website](https://zyvorai.github.io/verixa/) · [Quick start](#quick-start) · [Architecture](docs/ARCHITECTURE.md) · [Agent adapters](docs/AGENTS.md) · [API](docs/API.md) · [Changelog](CHANGELOG.md)

<img src="docs/ux/hero-overview.png" alt="Verixa console overview" width="900">

</div>

## Why

An agent can give a convincing answer and still change the wrong object, retry a committed
transaction, ignore a permission boundary, or leave the system in the wrong state.
Verixa evaluates **actions and outcomes**, not just the final sentence.

| Question | Verixa checks |
|---|---|
| Did the refund happen once? | Stateful refund ledger, balance and idempotency |
| Did a timeout hide a successful commit? | Faults before or after the simulated commit |
| Did approval cover the actual request? | Exact order and amount matching |
| Did malicious ticket text change infrastructure? | Tool policy and final deployment state |
| Did a new version regress? | Same-revision assertion comparison and release verdict |

## Quick start

Python **3.11+**. No runtime dependencies, no frontend build, no API key for the demo.

```bash
python3 -m verixa serve --demo
```

Open **http://127.0.0.1:8788** and sign in as **admin** with the API token printed in the
terminal as the password. With `VERIXA_TOKEN=Admin@321` the password is `Admin@321`.

Deploy to a server (HTTPS on port 30878, default login admin / Admin@321):

```bash
./scripts/deploy-remote.sh 10.0.1.5 user            # container; --k3s or --systemd also available
```

See [deployment](docs/DEPLOYMENT.md).
The demo seeds **11 actual simulator runs**: ten reference-agent runs and one known regression.
The reference and regression agents are explicitly scripted fixtures, not LLMs.

```bash
python3 -m verixa list
python3 -m verixa run all --junit artifacts/reference.xml
python3 -m verixa run ticket-injection --agent regression  # exits 3
python3 -m verixa run refund-commit-timeout --output artifacts/run.json
```

Exit codes: **0 passed**, **1 input/runtime error**, **3 failed outcome or regression gate**.

## Actual model integration

Use any endpoint implementing the OpenAI-compatible chat-completions tool-calling contract.
The model proposes calls; Verixa executes them against the simulated world.

```bash
export VERIXA_MODEL_URL=http://127.0.0.1:11434/v1
export VERIXA_MODEL=your-tool-capable-model
# export VERIXA_MODEL_KEY=...  # when your provider requires authentication
python3 -m verixa run all --agent model --allow-model-network \
  --output artifacts/model.json --junit artifacts/model.xml
```

Model network calls are **opt-in**. Task, policy and tool-result text goes to the configured
provider. Local simulator tools never call a payment gateway, ticket system or cluster.
The model sees all simulated tool schemas so tests can detect disallowed tool attempts.
Token usage is recorded when supplied by the endpoint; no monetary cost estimate is invented.

## Console

Netra's design language:
- The same sign-in screen, an Apple-style top nav and design tokens.
- Per-page hero glows, light/dark themes and mobile layouts.
- A pass-rate ring and verdict trend, and an evidence drawer with an action timeline.
- A step-by-step fault builder and a release-gate banner.

The Zyvor marks are shared with Netra.

| Evidence drawer | Fault studio | Compare versions |
|---|---|---|
| ![Evidence](docs/ux/02-evidence.png) | ![Fault studio](docs/ux/04-fault-studio.png) | ![Compare](docs/ux/05-compare.png) |

More in the [product tour](https://zyvorai.github.io/verixa/gallery).

| Surface | Working behavior |
|---|---|
| Overview | Recorded-run metrics and reference suite execution |
| Rehearsals | Search/filter, assertion inspection, timeline, export, trace replay |
| Scenario library | Ten bundled fixtures, JSON import/edit with server validation |
| Fault studio | Tool/occurrence selection, independent scenario creation, execution |
| Compare versions | Same-scenario-revision comparison and regression gate |
| Settings | Connection and session details, sign out, copyable API/model/CI snippets |

## Ten executable scenarios

Refund success; timeout before commit; response lost after commit; rate limit; malformed
result; held approval; simulated granted approval; expired credentials; malicious support
ticket; bounded deployment scale.

Tools: `order.get`, `refund.create`, `approval.request`, `ticket.get`, `ticket.close`,
`deployment.get`, `deployment.scale`.

The granted approval scenario is a fixture. It is not a real human authorization service.
The malformed fault returns a controlled error sentinel, not invalid JSON on the transport.
Custom faults can make outcomes fail; the reference agent is a test fixture, not a universal solver.

## Recording and replay

Each rehearsal records tool arguments, results, policy denials, state changes and an event
hash chain. Export a run or its action sequence:

```bash
python3 -m verixa export RUN_ID --output artifacts/evidence.json
python3 -m verixa export RUN_ID --trace --output artifacts/trace.json
python3 -m verixa run refund-happy --agent replay --trace artifacts/trace.json
python3 -m verixa verify artifacts/evidence.json
python3 -m verixa compare BASELINE_ID CANDIDATE_ID
```

Replay runs the exact action sequence in fresh simulated state; it does not invoke the original
model. Importing production traces requires conversion to the documented action format and
redaction by the operator. This release does not intercept live production traffic.

## Docker

```bash
docker compose up --build
```

Compose binds the console to localhost. Read the generated token from container logs.
SQLite state persists in the named volume. The container is non-root, with a read-only root
filesystem, dropped capabilities and a writable data volume. See [deployment](docs/DEPLOYMENT.md).

## Development and testing

```bash
make check
node tests/console.cjs
npm install --ignore-scripts
npx playwright install chromium
npm run test:browser
pip install --no-deps .
verixa list
```

Python tests cover engine correctness, approval matching, idempotency, fault recovery,
policy denial, input validation, persistence/concurrency, API authentication, CLI exit codes,
exports/replay, comparison and the model tool loop using a local mock provider. Chromium tests
cover the real UI against a running backend and run in CI. A separate console harness
tests application logic against a running API without rendering a browser. [Validation report](docs/VALIDATION.md).

## Status and boundaries

**0.1.0 is a runnable local evaluation release.** Its evidence class is
`simulated-tool-state`. Verixa executes model proposals against simulated state;
it does not prove an agent will behave identically in production.

The event chain detects local edits to sequence/hash links; it is not a signature or a proof
that the complete report/history is authentic. Someone who can rewrite all events can recompute
the chain. Scenario fixtures and assertions must be reviewed.

Not included in 0.1: browser-agent execution, MCP wire-protocol server, live production recording,
Keep/microVM integration, SSO/RBAC, distributed execution, reinforcement learning or pricing catalogs.
An in-process Python adapter is trusted code and is not sandboxed. The console supports scripted
agents and replay; model execution is CLI-only. [Roadmap](docs/ROADMAP.md).

## Contributing

Issues and pull requests are welcome: new simulated tools, fault types, agent adapters and
scenario packs especially. Read [CONTRIBUTING.md](CONTRIBUTING.md) and run `make check` before
opening a PR. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
Release and docs-site details are in [docs/PUBLISH.md](docs/PUBLISH.md).

## License

Apache-2.0. Copyright 2026 Zyvor AI Labs. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
