# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-04

First public release.

### Added

- Stateful simulation engine for orders, refunds, approvals, support tickets and deployments,
  with policy enforcement, idempotency keys and per-world state.
- Fault injection (`timeout`, `commit_timeout`, `rate_limit`, `malformed`,
  `expired_credentials`) at an exact tool and invocation.
- Final-state assertions, same-revision version comparison and a release gate (exit code 3).
- Ten bundled scenarios, including prompt injection through a support ticket.
- Reference, regression, replay and OpenAI-compatible model agent adapters.
- Evidence export with an event hash chain, action-trace export and deterministic replay.
- Zero-dependency HTTP server and console: Netra-style sign-in with HttpOnly session cookies,
  overview, rehearsals, scenario library, fault studio, compare and settings pages, plus light
  and dark themes.
- Host-header DNS-rebinding guard, strict CSP, optional direct TLS (`--tls-cert`/`--tls-key`).
- `scripts/deploy-remote.sh` for container, K3s (Helm) and systemd deployments over SSH.
- Documentation site at https://zyvorai.github.io/verixa/.
