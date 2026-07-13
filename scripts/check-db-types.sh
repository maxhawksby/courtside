#!/usr/bin/env bash
# check-db-types.sh - fail if packages/shared/src/db.generated.ts has drifted
# from the actual schema (i.e. someone added a migration without regenerating).
#
# Regenerates types from the running local Supabase stack into a temp file and
# diffs against the committed db.generated.ts.
#
# Usage: bash scripts/check-db-types.sh   (local stack must be up: npx supabase start)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMITTED="$ROOT/packages/shared/src/db.generated.ts"

say()  { printf '\033[1;34m[check-db-types]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[check-db-types]\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$COMMITTED" ] || fail "missing $COMMITTED — run: npx supabase gen types typescript --local --schema public > packages/shared/src/db.generated.ts"

TMP="$(mktemp --suffix=.db.generated.ts)"
trap 'rm -f "$TMP"' EXIT

say "regenerating types from the local database..."
if ! (cd "$ROOT" && npx supabase gen types typescript --local --schema public > "$TMP" 2>/dev/null); then
  fail "could not generate types — is the local Supabase stack running? (npx supabase start)"
fi

if ! diff -u "$COMMITTED" "$TMP"; then
  fail "db.generated.ts is out of date with the database schema.
Regenerate and commit it alongside your migration:
  npx supabase db reset
  npx supabase gen types typescript --local --schema public > packages/shared/src/db.generated.ts"
fi

say "OK — db.generated.ts matches the database schema."
