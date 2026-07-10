# Changelog

Plain-English record of what the app can do, newest first. Entries are written
for both Max and the client.

## Unreleased — Phase 1 core features (2026-07-10)

- Scheduling: coaches create games/practices/events; parents RSVP for
  themselves and their kids; everyone sees who's coming.
- Team chat and direct messages, with child safety built into the database
  itself: a chat containing a coach and a minor must always include a second
  adult (a guardian is added automatically), messages can never be truly
  deleted (a "deleted" marker keeps the audit trail), and late-night messages
  are flagged for the record.
- Directory upgrades: filter players vs adults, and group families into
  households.
- Player profile page: guardians manage each player's photo permission
  (photos of a minor stay hidden until a guardian says yes), plus private
  medical notes and emergency contacts that only the family and org admins
  can see.
- Role management: the owner grants coach/parent/scorekeeper/admin roles from
  the app; invites now carry a role.
- Web admin console (first version): browse the whole directory, teams with
  rosters, and the schedule from a browser.
- Security test suite doubled (11 → 23 checks). Writing those tests exposed a
  real hidden bug in the chat permission rules that would have blocked chat
  for everyone — found and fixed before anyone ever hit it.

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
