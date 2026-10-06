<div align="center">

# Verixa

[![CI](https://github.com/zyvorai/verixa/actions/workflows/ci.yml/badge.svg)](https://github.com/zyvorai/verixa/actions/workflows/ci.yml)
[![Docs](https://github.com/zyvorai/verixa/actions/workflows/pages.yml/badge.svg)](https://zyvorai.github.io/verixa/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](pyproject.toml)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)](pyproject.toml)

<img src="docs/social/verixa-hero-dark.jpg" alt="Verixa" width="100%">

## Rehearse every action. Ship with evidence.

**Know what your agent will do before it touches production.** Verixa runs your AI agent's tool calls
against simulated systems, breaks them on purpose and checks the final state. When a new model, prompt
or policy does worse, the release is blocked, with the evidence to show why.

[![Book a demo](https://img.shields.io/badge/Book_a_demo-0071e3?style=for-the-badge)](https://zyvor.dev/schedule?utm_source=github&utm_medium=verixa&utm_campaign=readme_hero)
[![30-day PoC](https://img.shields.io/badge/Start_a_30--day_PoC-000000?style=for-the-badge)](https://zyvor.dev/poc?utm_source=github&utm_medium=verixa&utm_campaign=readme_hero)
[![Quickstart](https://img.shields.io/badge/Quickstart-bf5af2?style=for-the-badge)](#quickstart)

Apache-2.0 · Zero runtime dependencies · Simulated tools only · Five fault types · Exit code 3 release gate · OpenAI-compatible models

[Website](https://zyvorai.github.io/verixa/) · [Product tour](https://zyvorai.github.io/verixa/gallery) · [Architecture](docs/ARCHITECTURE.md) · [Agent adapters](docs/AGENTS.md) · [API](docs/API.md) · [Changelog](CHANGELOG.md)

<img src="docs/ux/hero-overview.png" alt="Verixa console overview: pass rate, verdict trend and recent rehearsals" width="900">

<sub>Every rehearsal ends in a verdict on what actually changed.</sub>

</div>

---

| **Grade the outcome.** | **Break it on purpose.** | **Block the regression.** | **Keep the evidence.** |
|---|---|---|---|
| Pass or fail comes from the final state of balances, approvals and deployments, not from how convincing the reply sounds. | Inject a timeout, rate limit or expired credential at an exact tool call, before or after the commit. | Compare versions on the same scenario revision. A failing candidate exits 3 and stops the release in CI. | Every argument, result, policy denial and state change is recorded in an event hash chain you can export and replay. |

---

## Test what your agent does, not just what it says

An agent can give a convincing answer and still change the wrong record, retry a committed payment,
ignore a permission boundary or follow instructions hidden in a support ticket. Verixa evaluates
**actions and outcomes**, not just the final sentence.

### Simulate stateful systems

**A stateful world your agent can't break for real.** Orders, refunds, approvals, support tickets and
deployments behave like the real thing: policy, idempotency keys and balances included. Nothing ever
reaches a payment gateway, ticket system or cluster. Ten executable scenarios ship in the box; import or
edit more as JSON, validated by the server. The engine has no networking and no subprocess execution.

<img src="docs/ux/03-scenarios.png" alt="Scenario library with bundled fixtures and JSON import" width="860">

### Inject faults

**The failures that cause real incidents, placed exactly.** Pick a tool and an occurrence, choose
`timeout`, `commit_timeout`, `rate_limit`, `malformed` or `expired_credentials`, and run it. A timeout
before the commit and a response lost after it look identical to the agent; Verixa tests both.

<img src="docs/ux/04-fault-studio.png" alt="Fault studio with a step-by-step fault builder" width="860">

### Verify final state

**Did the refund happen once? Verixa checks.** Assertions run against the final simulated state.
Approvals must cover the exact order and amount, refund balances prevent over-refunding, tool policy is
enforced even when the agent asks for an unauthorized tool, and a missing assertion path fails.

<img src="docs/ux/02-evidence.png" alt="Evidence drawer with outcome checks and the action timeline" width="860">

### Compare versions and gate the release

**Ship the new model only when it does no worse.** Compare a baseline and a candidate on the same
scenario revision, so a changed expectation can't pass for an improvement. Runs store scenario hashes;
any failing candidate exits `3` and blocks CI, with JUnit reports for any CI system.

<img src="docs/ux/05-compare.png" alt="Version comparison with the release gate blocking a regression" width="860">

### Evidence and replay

**A record of what the agent actually did.** Each rehearsal records tool arguments, results, policy
denials, state diffs and an event hash chain. Export it, verify it, or replay the exact action sequence
in fresh simulated state.

<img src="docs/ux/01-rehearsals.png" alt="Rehearsals list with search, filters and export" width="860">

### Bring any model

**Bring the model you already run.** Point Verixa at any OpenAI-compatible chat-completions endpoint
with tool calling. The model proposes calls; Verixa executes them against the simulated world. Model,
replay and scripted reference adapters are included, or write your own Python adapter. Model network
calls are opt-in, from the command line.

<img src="docs/ux/06-dark.png" alt="Verixa overview in the dark theme" width="860">

---

## The rehearsal loop

**Propose → Policy check → Inject fault → Apply → Assert → Verdict**

Your agent proposes the next action. Verixa checks it against policy, injects the fault you configured,
applies the change to simulated state and, when the agent stops, decides the verdict from what changed.

- One engine for the command line and the console, with the same assertions and SQLite store.
- Model adapters can't mutate state directly; every change goes through policy.
- Each step records arguments, result, state diff and an event hash.
- Finished runs are saved as immutable records, ready to compare or export.

![One engine for CLI and console; state never leaves it](docs/ux/readme-how-it-works.jpg)

Full detail: [Architecture](docs/ARCHITECTURE.md) · [Agent adapters](docs/AGENTS.md) · [API](docs/API.md).

---

## Catch the failures a transcript hides

| Use case | What Verixa shows |
|---|---|
| **Refunds that happen once** | A response lost after the commit tempts the agent to retry. Verixa shows whether the refund went through exactly once. |
| **Approvals that match** | An approval only counts when it covers the exact order and amount. Approving one refund never authorizes another. |
| **Prompt injection, contained** | A support ticket tells the agent to scale production. Policy blocks it, and the final deployment state proves it. |
| **Safer infrastructure changes** | Rehearse bounded deployment scaling so an agent can't push replicas past the limit you set. |
| **Model and prompt upgrades** | Run the new version against the same scenarios. If it regresses, CI fails before anyone ships it. |
| **Flaky APIs and expired keys** | See how the agent copes with rate limits, malformed results and expired credentials before your users do. |

---

## Typical prompt/LLM eval tool vs Verixa

Prompt evals grade the reply. Verixa grades the outcome.

| | Typical prompt/LLM eval tool | **Verixa** |
|---|---|---|
| What is tested | Prompts and model replies across test cases | The agent's tool calls, executed against stateful simulated systems |
| Pass or fail signal | Assertions on the reply, often graded by another model | Assertions on final state: balances, approvals, deployments |
| Failure injection | Tool failures come from your own mocks or harness | Five built-in fault types at an exact tool call, before or after commit |
| Version comparison | Side-by-side outputs for prompts and providers | Same-scenario-revision comparison, with exit code 3 on regression |
| Adversarial input | Red-teaming of the model's replies | Injection through a simulated support ticket, checked against final state |
| Evidence | Eval results and a results viewer | Recorded actions, state diffs, an event hash chain and deterministic replay |

Prompt eval tools are the right fit for grading replies across many providers. Verixa is for rehearsing
the actions an agent takes, against simulated tool state ([Maturity](#maturity)).

---

## Quickstart

Python **3.11+**. No runtime dependencies, no frontend build, no API key for the demo.

```bash
git clone https://github.com/zyvorai/verixa && cd verixa
VERIXA_TOKEN=Admin@321 python3 -m verixa serve --demo
```

Open **http://127.0.0.1:8788** and sign in as **admin** / **Admin@321** (without `VERIXA_TOKEN`, use the
token printed in the terminal). The demo seeds **11 simulator runs**: ten reference-agent runs and one
known regression. The reference and regression agents are scripted fixtures, not LLMs.

```bash
python3 -m verixa list
python3 -m verixa run all --junit artifacts/reference.xml
python3 -m verixa run ticket-injection --agent regression  # exits 3
python3 -m verixa run refund-commit-timeout --output artifacts/run.json
```

Exit codes: **0 passed**, **1 input/runtime error**, **3 failed outcome or regression gate**.

Deploy to a server over SSH (HTTPS on port 30878, default login admin / Admin@321):

```bash
./scripts/deploy-remote.sh 10.0.1.5 user   # container; --k3s (Helm) or --systemd also available
```

See [deployment](docs/DEPLOYMENT.md).

## Model integration

Use any endpoint implementing the OpenAI-compatible chat-completions tool-calling contract.

```bash
export VERIXA_MODEL_URL=http://127.0.0.1:11434/v1
export VERIXA_MODEL=your-tool-capable-model
# export VERIXA_MODEL_KEY=...  # when your provider requires authentication
python3 -m verixa run all --agent model --allow-model-network \
  --output artifacts/model.json --junit artifacts/model.xml
```

Model network calls are **opt-in**; task, policy and tool-result text goes to the configured provider.
Local simulator tools never call a payment gateway, ticket system or cluster. The model sees all
simulated tool schemas so tests can detect disallowed tool attempts. Token usage is recorded when the
endpoint supplies it; no cost estimate is invented.

## Scenarios and console

Ten bundled scenarios: refund success; timeout before commit; response lost after commit; rate limit;
malformed result; held approval; simulated granted approval; expired credentials; malicious support
ticket; bounded deployment scale. Tools: `order.get`, `refund.create`, `approval.request`, `ticket.get`,
`ticket.close`, `deployment.get`, `deployment.scale`.

The granted-approval scenario is a fixture, not a real human authorization service. The malformed fault
returns a controlled error sentinel, not invalid JSON on the transport. The reference agent is a test
fixture, not a universal solver.

| Console surface | Working behavior |
|---|---|
| Overview | Recorded-run metrics and reference suite execution |
| Rehearsals | Search/filter, assertion inspection, timeline, export, trace replay |
| Scenario library | Bundled fixtures, JSON import/edit with server validation |
| Fault studio | Tool/occurrence selection, independent scenario creation, execution |
| Compare versions | Same-scenario-revision comparison and regression gate |
| Settings | Connection and session details, sign out, copyable API/model/CI snippets |

The console shares Netra's design language and Zyvor marks. More screens in the
[product tour](https://zyvorai.github.io/verixa/gallery).

## Recording and replay

```bash
python3 -m verixa export RUN_ID --output artifacts/evidence.json
python3 -m verixa export RUN_ID --trace --output artifacts/trace.json
python3 -m verixa run refund-happy --agent replay --trace artifacts/trace.json
python3 -m verixa verify artifacts/evidence.json
python3 -m verixa compare BASELINE_ID CANDIDATE_ID
```

Replay runs the exact action sequence in fresh simulated state; it does not invoke the original model.
Importing production traces requires conversion to the documented action format and redaction by the
operator. This release does not intercept live production traffic.

## Docker

```bash
docker compose up --build
```

Compose binds the console to localhost; read the generated token from the container logs. SQLite state
persists in a named volume. The container is non-root, with a read-only root filesystem, dropped
capabilities and a writable data volume. See [deployment](docs/DEPLOYMENT.md).

## Development and testing

```bash
make check
node tests/console.cjs
npm install --ignore-scripts
npx playwright install chromium
npm run test:browser
pip install --no-deps . && verixa list
```

Python tests cover engine correctness, approval matching, idempotency, fault recovery, policy denial,
input validation, persistence/concurrency, API authentication, CLI exit codes, exports/replay, comparison
and the model tool loop against a local mock provider. Chromium tests cover the real UI against a running
backend in CI; a separate harness tests console logic against a running API.
[Validation report](docs/VALIDATION.md).

---

## Maturity

**0.1.0 is a runnable local evaluation release** ([changelog](CHANGELOG.md)). Its evidence class is
`simulated-tool-state`: Verixa executes model proposals against simulated state; it does not prove an
agent will behave identically in production.

The event chain detects local edits to sequence/hash links; it is not a signature or a proof that the
complete report/history is authentic. Someone who can rewrite all events can recompute the chain.
Scenario fixtures and assertions must be reviewed.

Not included in 0.1: browser-agent execution, MCP wire-protocol server, live production recording,
Keep/microVM integration, SSO/RBAC, distributed execution, reinforcement learning or pricing catalogs.
An in-process Python adapter is trusted code and is not sandboxed. The console supports scripted agents
and replay; model execution is CLI-only. [Roadmap](docs/ROADMAP.md).

## Part of the Zyvor stack

| Product | Role next to Verixa |
|---|---|
| **Verixa** | Stateful AI agent rehearsal, fault injection and release gating |
| **[Netra](https://github.com/zyvorai/zyvor-netra)** | eBPF network observability; Verixa's console shares Netra's design language and Zyvor marks |
| **[Argus](https://github.com/zyvorai/zyvorai-argus)** | Autonomous QA for web apps; pairs with Verixa when you test the product UI and the agents behind it |
| **[Kairo](https://github.com/zyvorai/kairo)** | Kubernetes change intelligence; a pre-change verdict next to Verixa's pre-release agent verdict |
| **[Chimera](https://github.com/zyvorai/chimera)** | Infrastructure simulation engine for integration-testing migration tools, alongside Verixa's simulated tool worlds |

→ [zyvor.dev](https://zyvor.dev)

## Contributing

Issues and pull requests are welcome: new simulated tools, fault types, agent adapters and scenario
packs especially. Read [CONTRIBUTING.md](CONTRIBUTING.md) and run `make check` before opening a PR.
Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Release and docs-site
details are in [docs/PUBLISH.md](docs/PUBLISH.md).

## License

Verixa is **free and open source** under the [Apache License 2.0](LICENSE). Copyright 2026 Zyvor AI Labs.
See [LICENSE](LICENSE) and [NOTICE](NOTICE).

**Zyvor Enterprise** adds what production teams ask for: supported releases, deployment and upgrade
guidance, priority incident triage, a named technical contact and 24x7 critical intake.
[Pricing](https://zyvor.dev/pricing?utm_source=github&utm_medium=verixa&utm_campaign=readme_license) · [sales@zyvor.dev](mailto:sales@zyvor.dev).

---

<div align="center">

### Rehearse your agents before they touch production

[![Book a demo](https://img.shields.io/badge/Book_a_demo-0071e3?style=for-the-badge)](https://zyvor.dev/schedule?utm_source=github&utm_medium=verixa&utm_campaign=readme_footer)
[![30-day PoC](https://img.shields.io/badge/Start_a_30--day_PoC-000000?style=for-the-badge)](https://zyvor.dev/poc?utm_source=github&utm_medium=verixa&utm_campaign=readme_footer)
[![Pricing](https://img.shields.io/badge/Pricing-1d1d1f?style=for-the-badge)](https://zyvor.dev/pricing?utm_source=github&utm_medium=verixa&utm_campaign=readme_footer)
[![Contact sales](https://img.shields.io/badge/Contact_sales-2997ff?style=for-the-badge)](mailto:sales@zyvor.dev?subject=Verixa)
[![Star on GitHub](https://img.shields.io/github/stars/zyvorai/verixa?style=for-the-badge&logo=github&label=Star&color=2997ff)](https://github.com/zyvorai/verixa)

</div>
