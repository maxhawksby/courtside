#!/usr/bin/env bash
# ci-db-tests.sh - run packages/db-tests against the local Supabase stack and
# HARD-FAIL on skipped tests.
#
# db-tests env-skip by design when the SUPABASE_* vars are absent (keeps plain
# `npm test` usable without a stack). In CI that same behavior could
# green-wash a run where env plumbing silently broke, so this wrapper:
#   1. resolves env from `npx supabase status` (stack must be running),
#   2. runs vitest with a JSON report,
#   3. asserts: 0 failed, 0 skipped, and >= MIN_TESTS tests actually passed.
#
# Usage: bash scripts/ci-db-tests.sh
#        bash scripts/ci-db-tests.sh --no-env   # negative proof: withhold env;
#                                               # the guard must exit nonzero
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_TESTS=28 # floor = today's suite count; raise as RLS suites grow

say()  { printf '\033[1;34m[ci-db-tests]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[ci-db-tests]\033[0m %s\n' "$*" >&2; exit 1; }

cd "$ROOT"

if [[ "${1:-}" == "--no-env" ]]; then
  say "--no-env: deliberately withholding SUPABASE_* (skip-guard negative proof)"
  unset SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
else
  eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')" \
    || fail "could not read supabase status — is the local stack running? (npx supabase start)"
  export SUPABASE_URL="${API_URL:-}" SUPABASE_ANON_KEY="${ANON_KEY:-}" SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
  { [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; } \
    || fail "supabase status returned an empty API_URL / ANON_KEY / SERVICE_ROLE_KEY"
fi

REPORT="$(mktemp --suffix=.vitest.json)"
trap 'rm -f "$REPORT"' EXIT

# vitest exits nonzero on failures but exits ZERO when every suite skips —
# that is exactly the hole the JSON assert below closes. `|| true` so the
# assert (with its clearer message) is what fails the job, not vitest itself.
npm test --workspace @courtside/db-tests -- \
  --reporter=default --reporter=json --outputFile="$REPORT" || true

node -e '
  const fs = require("fs");
  const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const passed = r.numPassedTests ?? 0;
  const failed = r.numFailedTests ?? 0;
  const skipped = (r.numPendingTests ?? 0) + (r.numTodoTests ?? 0);
  const min = Number(process.argv[2]);
  console.log(`[ci-db-tests] passed=${passed} failed=${failed} skipped=${skipped} (required: >=${min} passed, 0 skipped)`);
  if (failed > 0) { console.error("[ci-db-tests] FAIL: test failures"); process.exit(1); }
  if (skipped > 0) { console.error("[ci-db-tests] FAIL: skipped tests — the RLS suites did not actually run (env not reaching vitest?)"); process.exit(1); }
  if (passed < min) { console.error(`[ci-db-tests] FAIL: only ${passed} tests executed, expected >= ${min}`); process.exit(1); }
' "$REPORT" "$MIN_TESTS"

say "OK — all RLS tests executed against a live database, none skipped."
