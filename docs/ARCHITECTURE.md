# Architecture

The CLI and HTTP console share the same World, agent interface, assertions and SQLite store.

1. Validate a scenario and copy its initial state.
2. Ask an agent adapter for its next tool proposal.
3. Validate tool arguments and evaluate the scenario's policy.
4. Inject a fault at the configured tool invocation, before or after commit.
5. Apply a simulated state transition and record result/state diff/event hash.
6. Repeat until the agent stops, throws, or reaches the step limit.
7. Evaluate final-state assertions and save an immutable run record.

`engine.py` has no networking or subprocess execution. Its permission checks remain effective
even when the agent asks for an unauthorized tool. Model adapters cannot directly mutate World.
Input copies keep agent-side Python mutations separate from simulation state, but a custom
Python adapter still runs in the same trusted process and is not a security sandbox.

Refund keys are scoped to one World. Reusing a key for a different order/amount produces a
conflict. A response-lost-after-commit fault commits once; a stable-key retry deduplicates.
Approval records match the exact order and amount. Refund balance prevents over-refunding.

Runs store scenario hashes. Comparison requires equal hashes so a changed expected outcome
cannot accidentally appear as a model improvement. Any failing candidate blocks the gate.
Missing assertion paths fail. Numeric comparisons exclude booleans; JSON numbers must be finite.

HTTP model execution is deliberately absent: authenticated console clients can run only the
bundled scripted agents or bounded replay sequences. Model provider configuration is local CLI
environment. HTTP threads use separate SQLite connections and per-write transactions.

The bundled malformed fault is a simulator error envelope. Transport-corruption testing,
timeouts in custom adapters, and process containment need future isolated execution adapters.
