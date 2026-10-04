---
sidebar_position: 1
---

# Architecture

The CLI and the HTTP console share the same simulated world, agent interface, assertions and
SQLite store.

```text
agent adapter ──proposes tool call──▶ validate + policy ──▶ fault injection ──▶ simulated world
      ▲                                                                              │
      └──────────────── result + state diff + event hash ◀───────────────────────────┤
                                                                                     ▼
                                             SQLite run record ◀── final-state assertions
```

1. Validate a scenario and copy its initial state.
2. Ask the agent adapter for its next tool call.
3. Validate the arguments and evaluate the scenario's policy.
4. Inject a fault at the configured invocation, before or after the commit.
5. Apply the simulated state change, and record the result, the state diff and an event hash.
6. Repeat until the agent stops, throws, or reaches the step limit.
7. Evaluate final-state assertions and save an immutable run record.

## Guarantees

- `engine.py` has no networking or subprocess execution. Permission checks still apply when an
  agent asks for an unauthorized tool, and model adapters cannot mutate the world directly.
- Refund idempotency keys are scoped to one world. Reusing a key for a different order or
  amount is a conflict. A response lost after commit commits once, and a retry with a stable
  key deduplicates.
- Approvals match the exact order and amount. Refund balance prevents over-refunding.
- Runs store scenario hashes. Comparison requires equal hashes, so a changed expected outcome
  can't masquerade as a model improvement. Any failing candidate blocks the gate.
- Missing assertion paths fail. Numeric comparisons exclude booleans, and JSON numbers must be
  finite.

## Tools

`order.get`, `refund.create`, `approval.request`, `ticket.get`, `ticket.close`,
`deployment.get`, `deployment.scale`. Local simulator tools never call a payment gateway,
ticket system or cluster.

## Evidence and its limits

Each rehearsal records tool arguments, results, policy denials, state changes and an event hash
chain. The evidence class is `simulated-tool-state`. The chain detects local edits to sequence
and hash links. It is not a signature: someone who can rewrite every event can recompute it.

HTTP model execution is deliberately absent. Authenticated console clients can run only the
bundled scripted agents or bounded replay sequences. Model execution is CLI-only.
