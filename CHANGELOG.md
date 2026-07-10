# Changelog

Plain-English record of what the app can do, newest first. Entries are written
for both Max and the client.

## Unreleased — Phase 0 foundations (2026-07-09)

- Database verified against a real running instance for the first time: all 11
  security tests pass — parents see only their own kids, coaches only their
  teams, anonymous visitors nothing; the under-13 no-login rule, the guardian
  cap, and the no-deleting-messages rule all hold. Found and fixed one gap the
  live database exposed: table access permissions for the app's database roles
  were never written down explicitly, so the app would have gotten
  "permission denied" on every request. Now spelled out in the schema itself.

- Project scaffolded: one codebase that builds the iPhone/Android app, the web
  admin console, and the database definitions together.
- Database v1 designed and written: the organization owns everything — people
  (parents, players, coaches) are permanent records; teams, rosters, schedules,
  chat channels, and game play-by-play all hang off it. Security rules are
  enforced in the database itself (who can see whom, parents linked to their
  own kids, coaches to their own teams).
- Child-safety rules built into the foundation: under-13 players can never have
  login accounts, guardian limits enforced, messages can never be hard-deleted.
