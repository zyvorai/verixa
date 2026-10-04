---
sidebar_position: 1
---

# Quickstart

Verixa needs **Python 3.11+**. It has no runtime dependencies, no frontend build step, and
needs no API key for the demo.

## Run the demo

```bash
git clone https://github.com/zyvorai/verixa && cd verixa
VERIXA_TOKEN=Admin@321 python3 -m verixa serve --demo
```

Open **http://127.0.0.1:8788** and sign in as **admin / Admin@321**. Without `VERIXA_TOKEN`, a
random token is printed at startup; sign in as `admin` with that token as the password.

The demo seeds **11 real simulator runs**: ten reference-agent runs and one known regression.
The reference and regression agents are scripted fixtures, not LLMs.

## Use the CLI

```bash
python3 -m verixa list                                     # bundled scenarios
python3 -m verixa run all --junit artifacts/reference.xml  # whole suite, JUnit for CI
python3 -m verixa run ticket-injection --agent regression  # exits 3
python3 -m verixa run refund-commit-timeout --output artifacts/run.json
```

| Exit code | Meaning |
|---|---|
| `0` | Every rehearsal passed |
| `1` | Input or runtime error |
| `3` | Failed outcome or regression gate |

## Record, replay, compare

```bash
python3 -m verixa export RUN_ID --output artifacts/evidence.json
python3 -m verixa export RUN_ID --trace --output artifacts/trace.json
python3 -m verixa run refund-happy --agent replay --trace artifacts/trace.json
python3 -m verixa verify artifacts/evidence.json
python3 -m verixa compare BASELINE_ID CANDIDATE_ID
```

Replay runs the exact action sequence in fresh simulated state; it does not call the
original model.

## Test a real model

Any endpoint that implements the OpenAI-compatible chat-completions tool-calling contract works.
The model proposes calls; Verixa executes them against the simulated world.

```bash
export VERIXA_MODEL_URL=http://127.0.0.1:11434/v1
export VERIXA_MODEL=your-tool-capable-model
# export VERIXA_MODEL_KEY=...   # when your provider requires it
python3 -m verixa run all --agent model --allow-model-network \
  --output artifacts/model.json --junit artifacts/model.xml
```

Model network calls are **opt-in**. Task, policy and tool-result text is sent to the configured
provider. Next: [the console](./console.md) or [deploy to a server](./deploy.md).
