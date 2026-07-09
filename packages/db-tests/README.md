# @courtside/db-tests

Executable RLS (row-level security) policy tests for `schema_v1`. These tests
exercise the real Postgres policies and triggers against a running Supabase
instance — they are not unit tests and do not mock the database.

## What this covers

`src/rls.test.ts` builds one synthetic organization (owner / parent / coach /
follower users, a linked child player, an unrelated player, a team + roster,
a game, and a channel with a message) and asserts, per role, exactly what the
`persons`, `persons_sensitive`, `game_events`, and `messages` policies allow
or deny — plus the COPPA min-age trigger and the guardianship cap trigger.

## Running

1. Start a local Supabase stack from the repo root:

   ```sh
   npx supabase start
   ```

2. Read the connection info it prints (or re-print it any time with
   `npx supabase status`) and export it:

   ```sh
   export SUPABASE_URL=$(npx supabase status -o json | jq -r '.API_URL')
   export SUPABASE_ANON_KEY=$(npx supabase status -o json | jq -r '.ANON_KEY')
   export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
   ```

   (Or just copy the `API URL`, `anon key`, and `service_role key` values
   from the plain-text `npx supabase status` output into your shell.)

3. Run the suite:

   ```sh
   npm run test --workspace packages/db-tests
   ```

## Skipping cleanly

If `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is
unset, the entire suite is skipped (not failed) — safe to run in CI or
locally with no database up. Vitest will report the file as skipped.

## Fixtures

All fixture data lives under `@example.com` and is created fresh in
`beforeAll` using a service-role client (bypasses RLS), then torn down in
`afterAll` by deleting the fixture organization (cascades through every
child table) and the four fixture `auth.users`. Nothing here reads or writes
outside the fixture org.

Because the fixtures are created once and shared across tests, this suite
runs sequentially (`vitest.config.ts` disables parallelism) — do not remove
that setting without re-checking test isolation.
