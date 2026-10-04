# Agent adapters

A trusted Python adapter exposes `name`, optional `usage`, and
`next_action(scenario, events)`. Return exactly `{"tool": "tool.name", "args": {...}}`
or `None` to stop. Inputs are defensive copies. Errors fail the run; only the exception
class is persisted, to avoid leaking provider diagnostics.

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
result = run(s, Agent())
assert result["verdict"] == "PASS"
```

ReplayAgent validates at most 100 actions, then proposes them in order. It supports
exported action-only traces. To replay a run export, extract `tool` and `args` from each event.

ModelAgent uses `/chat/completions` with one tool call per turn. Tool names are converted
from `refund.create` to `refund__create` for provider compatibility. The adapter rebuilds
messages from observed events, records provider token counts, bounds responses to 1 MB,
uses a 30-second per-request timeout and disallows redirects. Models must support this
contract; provider compatibility beyond the local mock has not been tested here.

Model output is nondeterministic even at temperature zero. Exact replay is deterministic
for the same scenario/action sequence; live model executions are not.
