#!/usr/bin/env bash
# Real-Git adversarial controls for original-HEAD checkout admission; no tokens/network.
set -euo pipefail
checker="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/verify_ci_source_head.sh"
root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT
cd "$root"
git init -q
git config user.email ci-source-identity@example.invalid
git config user.name source-identity-fixture
printf 'reviewed\n' > fixture.atto
printf '*.ignored\n' > .gitignore
mkdir src
printf 'source\n' > src/guest.atto
git add fixture.atto .gitignore src/guest.atto
git commit -qm 'source fixture'
head="$(git rev-parse HEAD)"
checks=0
accept() {
  EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null || { echo "valid checkout rejected: $1" >&2; exit 1; }
  checks=$((checks+1))
}
reject() {
  if EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null 2>&1; then
    echo "invalid checkout accepted: $1" >&2; exit 1
  fi
  checks=$((checks+1))
}
accept 'clean tracked checkout'
wrong="${head:0:39}$([[ "${head:39:1}" == 0 ]] && printf 1 || printf 0)"
if EXPECTED_SOURCE_SHA="$wrong" bash "$checker" >/dev/null 2>&1; then
  echo 'wrong revision accepted' >&2; exit 1
fi
checks=$((checks+1))
if EXPECTED_SOURCE_SHA='not-a-sha' bash "$checker" >/dev/null 2>&1; then
  echo 'malformed revision accepted' >&2; exit 1
fi
checks=$((checks+1))
if env -u EXPECTED_SOURCE_SHA bash "$checker" >/dev/null 2>&1; then
  echo 'missing revision accepted' >&2; exit 1
fi
checks=$((checks+1))
printf 'mutated\n' >> fixture.atto
reject 'modified tracked file'
git checkout -- fixture.atto
printf 'untracked\n' > injected.atto
reject 'untracked file'
rm injected.atto
printf 'ignored payload\n' > injected.ignored
reject 'ignored untracked file'
rm injected.ignored
# On case-sensitive Linux, core.ignorecase=true hides an untracked case alias in Git status.
git config core.ignorecase true
printf 'case alias\n' > FIXTURE.atto
reject 'case-folding alias of a tracked file'
rm FIXTURE.atto
mkdir SRC
printf 'nested alias\n' > SRC/guest.atto
reject 'case-folding directory alias'
rm -r SRC
git config core.ignorecase false
git update-index --assume-unchanged fixture.atto
reject 'assume-unchanged bit'
git update-index --no-assume-unchanged fixture.atto
git update-index --skip-worktree fixture.atto
reject 'skip-worktree bit'
git update-index --no-skip-worktree fixture.atto
if GIT_INDEX_FILE="$root/alternate-index" EXPECTED_SOURCE_SHA="$head" bash "$checker" >/dev/null 2>&1; then
  echo 'alternate Git index accepted' >&2; exit 1
fi
checks=$((checks+1))
accept 'clean recovery after hostile mutations'
echo "exact-source guard: $checks real Git controls passed"
