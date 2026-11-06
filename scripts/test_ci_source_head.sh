#!/usr/bin/env bash
# Offline negative controls for the exact source HEAD guard; no GitHub token needed.
set -euo pipefail

checker="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/verify_ci_source_head.sh"
root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT
cd "$root"
git init -q
git config user.email ci-source-identity@example.invalid
git config user.name source-identity-fixture
printf 'reviewed\n' > fixture.atto
git add fixture.atto
git commit -qm 'source fixture'
head="$(git rev-parse HEAD)"

EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null
wrong="${head:0:39}$([[ "${head:39:1}" == 0 ]] && printf 1 || printf 0)"
if EXPECTED_SOURCE_SHA="$wrong" bash "$checker" >/dev/null 2>&1; then
  echo 'wrong revision accepted' >&2; exit 1
fi
if EXPECTED_SOURCE_SHA='not-a-sha' bash "$checker" >/dev/null 2>&1; then
  echo 'malformed revision accepted' >&2; exit 1
fi
if env -u EXPECTED_SOURCE_SHA bash "$checker" >/dev/null 2>&1; then
  echo 'missing revision accepted' >&2; exit 1
fi
printf 'mutated\n' >> fixture.atto
if EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null 2>&1; then
  echo 'modified tracked source accepted' >&2; exit 1
fi
git checkout -- fixture.atto
printf 'untracked\n' > injected.atto
if EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null 2>&1; then
  echo 'untracked source accepted' >&2; exit 1
fi
rm injected.atto
EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null
printf 'exact-source guard: 6 hostile/positive controls passed\n'
