#!/usr/bin/env bash
# BookLog standing rules as one command. Same script runs in the pre-commit hook (--fast) and in CI (full).
#   Local, staged changes:  bash scripts/check.sh --fast
#   CI (PR):                CHECK_BASE=origin/main PR_BODY="..." bash scripts/check.sh
set -u
FAST=0; [ "${1:-}" = "--fast" ] && FAST=1
STATUS=0
step() { echo; echo "== $1"; }
run() { "$@" || STATUS=1; }

step "Rule: no secrets in the repo"; run node scripts/secrets-scan.mjs
step "Rule: no spending without Pakshiraj's OK"; run node scripts/no-spend-check.mjs
step "Rule: how changes are made (lockfile, migrations, rule files)"; run node scripts/pr-rules.mjs

step "Rule: no regression - tests"
node --test tests/*.test.cjs || { STATUS=1; echo; echo "RULE BROKEN: no regression"; echo "  What: tests failed (names above)."; echo "  Fix:  fix the code, or fix the test if the behaviour change is intended. Never delete or skip a test to get green."; }

step "Rule: no regression - typecheck"
npx tsc --noEmit || { STATUS=1; echo; echo "RULE BROKEN: no regression"; echo "  What: TypeScript errors (above)."; echo "  Fix:  fix the types. Do not loosen tsconfig or add ts-ignore."; }

if [ "$FAST" = 0 ]; then
  step "Rule: no regression - production build"
  NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://example.supabase.co}" NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-build-check-placeholder}" npx next build || { STATUS=1; echo; echo "RULE BROKEN: no regression"; echo "  What: next build failed (above). Vercel would fail the same way."; echo "  Fix:  fix the build error shown above."; }
fi

echo
if [ "$STATUS" = 0 ]; then echo "ALL CHECKS PASSED"; else echo "CHECKS FAILED - see 'RULE BROKEN' above"; fi
exit $STATUS
