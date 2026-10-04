#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
visibility="${1:---private}"
if [[ "$visibility" != "--private" && "$visibility" != "--public" ]]; then
  echo 'Usage: scripts/create-github-repo.sh [--private|--public]' >&2
  exit 1
fi
command -v gh >/dev/null || { echo 'Install GitHub CLI (gh) first.' >&2; exit 1; }
gh auth status >/dev/null
if [[ -d .git ]]; then
  echo 'This directory already has Git history. Use the manual commands in docs/PUBLISH.md.' >&2
  exit 1
fi
if gh repo view zyvorai/verixa >/dev/null 2>&1; then
  echo 'zyvorai/verixa already exists. No changes were made.' >&2
  exit 1
fi
python3 -m unittest discover -s tests -q
git init -b main
git add .
git commit -m "feat: agent rehearsal engine, evidence console and regression gates"
gh repo create zyvorai/verixa "$visibility" --description "Stateful AI agent rehearsal and outcome verification. Rehearse every action. Ship with evidence." --source=. --remote=origin --push
