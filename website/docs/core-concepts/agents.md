---
sidebar_position: 3
---

# Agent adapters

A trusted Python adapter exposes `name`, optional `usage`, and `next_action(scenario, events)`.
Return exactly `{"tool": "tool.name", "args": {...}}`, or `None` to stop. Inputs are defensive
copies. Errors fail the run, and only the exception class is persisted.

```python
from verixa.engine import run
from verixa.scenarios import bundled

class Agent:
    name = "my-agent-v1"
    def next_action(self, scenario, events):
        if not events:
            return {"tool": "deployment.get", "args": {"name": "payments"}}
        if len(events) == 1:
            return {"tool": "deployment.scale", "args": {"name": "payments", "replicas": 3}}
        return None

s = next(s for s in bundled() if s["id"] == "infra-scale")
assert run(s, Agent())["verdict"] == "PASS"
```

An in-process adapter is trusted code and is not sandboxed.

## Built-in adapters

| Adapter | Behaviour |
|---|---|
| `reference` | Scripted fixture that retries with stable keys |
| `regression` | Scripted fixture with known mistakes, used to demonstrate the gate |
| `replay` | Proposes up to 100 recorded actions in order against fresh state |
| `model` | OpenAI-compatible `/chat/completions`, one tool call per turn |

The model adapter converts tool names from `refund.create` to `refund__create` for provider
compatibility. It rebuilds messages from observed events and records provider token counts.
Responses are bounded to 1 MB, each request times out after 30 seconds, and redirects are not
followed. Model output is nondeterministic. Replay is deterministic for the same scenario and
action sequence.
