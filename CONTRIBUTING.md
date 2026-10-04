# Contributing

Use Python 3.11+, Node 22+ for browser tests. Run `make check` and `npm run test:browser`.
Keep the simulator independent of real production systems. New tools need bounded input
schemas, policy checks, state-transition tests and failure scenarios. Never silently convert
simulated evidence into production or hardware-verification claims. Use cents as integers.
Frontend data must be escaped; do not insert scenario strings as executable HTML.

Prefer small PRs with a concrete behavior change, executable fixture and validation notes.
