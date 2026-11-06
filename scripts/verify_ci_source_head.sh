#!/usr/bin/env bash
# Source-owned CI must run at the immutable event commit, not an implicit PR merge ref.
set -euo pipefail

if [[ ! "${EXPECTED_SOURCE_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'SOURCE_HEAD_UNVERIFIED: expected original commit must be 40 lowercase hexadecimal characters' >&2
  exit 1
fi

actual="$(git rev-parse --verify HEAD 2>/dev/null)" || {
  echo 'SOURCE_HEAD_UNVERIFIED: no Git checkout' >&2
  exit 1
}
if [[ "$actual" != "$EXPECTED_SOURCE_SHA" ]]; then
  echo 'SOURCE_HEAD_MISMATCH: refused to run tests at the wrong source commit' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain=v1 --untracked-files=all)" ]]; then
  echo 'SOURCE_TREE_DIRTY: refused to test modified or untracked source' >&2
  exit 1
fi

tree="$(git rev-parse --verify 'HEAD^{tree}' 2>/dev/null)" || {
  echo 'SOURCE_TREE_UNVERIFIED: cannot read committed tree' >&2
  exit 1
}
if [[ ! "$tree" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'SOURCE_TREE_UNVERIFIED: invalid tree object ID' >&2
  exit 1
fi
printf 'EXACT_SOURCE_HEAD=%s\nEXACT_SOURCE_TREE=%s\n' "$actual" "$tree"
