# Validation report — 0.1.0

Executed in the authoring environment with Python 3.12 and Node.js:

| Check | Result |
|---|---|
| Engine, API, store, CLI, model-adapter unittest suite | 55 tests passed |
| Console logic against a running authenticated API | 19 checks passed; nonvisual DOM facade |
| Ten bundled reference-agent scenarios | All PASS |
| Known prompt-injection regression | FAIL, unauthorized side effect blocked |
| Refund response lost after commit | Stable-key retry PASS, new-key regression FAIL |
| Python source compilation | Passed |
| Browser JavaScript syntax | Passed |
| Publish script shell syntax | Passed |
| Python wheel build and isolated installed-package smoke | Passed; static console assets present |

The model adapter was tested end-to-end against a local mock chat-completions server,
including actual HTTP requests, tool-call messages and token usage. No external provider
or live model was available for validation. Real-model task success is not claimed.

**Chromium visual and browser interaction tests were not executed.** Playwright's JavaScript
package is installed here, but no browser binary is present. The attempted Chromium download
returned an invalid archive. `tests/browser.cjs` is provided and wired into GitHub CI; it tests
desktop/mobile navigation, searches, runs, evidence, replay, faults, comparison, escaping,
theme persistence and disconnect. No generated screenshots are presented as actual captures.

The nonvisual console harness exercises the actual `app.js` with a minimal DOM facade and
real HTTP API. It checks routing/render output and execution logic, but cannot establish
pixel layout, browser compatibility or accessibility behavior.

Docker build/run and Python 3.11/3.13 are configured in CI, but were not run here. There is no
Docker daemon available in this environment. CI results will exist only after the repo is pushed.

This is an evaluation release, not an assertion of universal agent correctness, production
readiness, or exhaustive testing of every possible custom scenario.
