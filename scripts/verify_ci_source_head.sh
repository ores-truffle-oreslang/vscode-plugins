#!/usr/bin/env bash
# Exact original PR source and checkout integrity. Never certifies compiler guest execution.
set -euo pipefail
export GIT_NO_REPLACE_OBJECTS=1

if [[ ! "${EXPECTED_SOURCE_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'SOURCE_HEAD_UNVERIFIED: expected original commit must be 40 lowercase hex characters' >&2
  exit 1
fi
# Do not allow caller-selected alternate indexes/worktrees to redefine checkout integrity.
if [[ -n "${GIT_INDEX_FILE:-}" || -n "${GIT_WORK_TREE:-}" || -n "${GIT_DIR:-}" ]]; then
  echo 'SOURCE_GIT_ENV_UNTRUSTED: alternate index, worktree or Git directory' >&2
  exit 1
fi
# Repository-local ignorecase/untracked cache/fsmonitor can hide real physical files.
checked_git() {
  command git -c core.ignorecase=false -c core.untrackedCache=false -c core.fsmonitor=false "$@"
}
actual="$(checked_git rev-parse --verify HEAD 2>/dev/null)" || {
  echo 'SOURCE_HEAD_UNVERIFIED: no Git checkout' >&2
  exit 1
}
if [[ "$actual" != "$EXPECTED_SOURCE_SHA" ]]; then
  echo 'SOURCE_HEAD_MISMATCH: refused to test a different revision' >&2
  exit 1
fi
status="$(checked_git status --porcelain=v1 --untracked-files=all)" || {
  echo 'SOURCE_STATUS_UNVERIFIED: Git status failed' >&2
  exit 1
}
if [[ -n "$status" ]]; then
  echo 'SOURCE_TREE_DIRTY: modified or untracked files' >&2
  exit 1
fi
# Status intentionally hides ignored paths, which can still affect build inputs.
extras="$(checked_git ls-files --others --ignored --exclude-standard)" || {
  echo 'SOURCE_INVENTORY_UNVERIFIED: Git enumeration failed' >&2
  exit 1
}
if [[ -n "$extras" ]]; then
  echo 'SOURCE_TREE_DIRTY: untracked or ignored physical files' >&2
  exit 1
fi
# assume-unchanged and skip-worktree flags hide content from regular status/diff.
flags="$(checked_git ls-files -v)" || {
  echo 'SOURCE_INDEX_UNVERIFIED: Git tracked-file inventory failed' >&2
  exit 1
}
if [[ "$flags" =~ (^|$'\n')[a-zS] ]]; then
  echo 'SOURCE_INDEX_UNTRUSTED: skip-worktree or assume-unchanged tracked path' >&2
  exit 1
fi
tree="$(checked_git rev-parse --verify 'HEAD^{tree}' 2>/dev/null)" || {
  echo 'SOURCE_TREE_UNVERIFIED: cannot read committed tree' >&2
  exit 1
}
if [[ ! "$tree" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'SOURCE_TREE_UNVERIFIED: invalid tree object ID' >&2
  exit 1
fi
printf 'EXACT_SOURCE_HEAD=%s\nEXACT_SOURCE_TREE=%s\n' "$actual" "$tree"
