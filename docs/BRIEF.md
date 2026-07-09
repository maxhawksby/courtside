# Product Brief — courtside (working codename)

## The one-liner

A custom coaching platform for one basketball program: everything coaches and parents use
GameChanger for, plus the thing GameChanger structurally cannot do — an org-wide database of
parents, players, and teams that the program owner fully controls.

## Why this exists

The client (a basketball coach running a multi-team program) uses GameChanger today. It's
excellent per-team consumer software, but its data model makes teams self-owned, per-season
objects that merely *affiliate* with an organization:

- Org admins cannot see rosters, parents, or contacts across teams. There is no directory.
- No division/program hierarchy (GC's own docs say "make a separate org per division").
- Roster "rollover" creates new team objects — longitudinal person history is destroyed.
- No registration, no payments, no cross-team schedule view, one-way announcements only.

Our app inverts the model: **the organization is the root entity and owns everything.**
People are persistent records; teams and rosters are relationships. That single decision
produces the differentiator and most of the product's long-term value.

## Users & roles

| Role | Login | What they do |
|---|---|---|
| Org owner (the client) | yes | Configures everything: divisions, teams, seasons, people, roles, forms, branding |
| Division admin | yes | Same powers scoped to a division |
| Coach / team staff (uncapped) | yes | Roster, schedule, messaging, scoring for their team |
| Scorekeeper | yes | Designated per game; runs the scoring UI |
| Parent / guardian | yes | Household owner; manages linked player profiles, RSVPs, chat, follows games |
| Family / friend follower | yes | Follow-only: schedule, scores, public content |
| Player 13+ | optional | Own login tied to their person record |
| Player under 13 | **never** | Adult-managed sub-profile only (COPPA-safe by construction) |

## Scope

### Parity features (reference-app equivalents, basketball only)

- Teams & season rosters over persistent player records; CSV import; roster rollover that
  moves links, not people.
- Scheduling: games/practices/events (arrival time, location, recurrence), RSVP + bulk RSVP
  + staff override, ICS calendar sync, "save & message team".
- **Basketball scorekeeping (offline-first — gyms have bad Wi-Fi, non-negotiable)**:
  2PT/3PT/FT flows (1-and-1/1/2/3-shot), rebounds/assists/steals/blocks/turnovers, per-player
  fouls, timeouts, starting five + substitutions, auto-prompts (made shot → assist picker;
  missed → rebound picker), editable play-by-play, resume-scoring after finalize,
  halves/quarters + opponent-scoring modes.
- Stats: box scores incl. +/-, season totals/averages with filters, eFG%/TS%/AST-to-TO,
  CSV export.
- Live game following: realtime score + play-by-play feed for remote parents.
- Messaging: auto all-hands channel per team, custom channels, group/1:1 DMs, media sharing,
  staff delete with tombstone, mutes, read-only/announcements mode.
- Push notifications throughout; email fallback for non-app users.

### Differentiator (the reason this project exists)

- Persistent person records + household model (parent = account owner; players = sub-profiles;
  many-to-many guardianship; duplicate detect/merge on name+DOB; org-defined custom fields).
- Org-wide directory: search/filter across all teams by team, division, age, role,
  registration status, balance. Master schedule across all teams (gym-conflict spotting).
  Cross-season per-player history. CSV import/export, saved reports.
- Segment messaging from directory filters ("all 12U parents", "unpaid families").
- Web admin console: the coach configures the entire program without a developer.
- Phase 4 — registration & payments: form builder (waivers, media consent, medical, sizes),
  Stripe checkout, payment plans, auto-rostering. Registration is how the database populates
  itself.

### Later (post-launch phases)

Live streaming & video (record-then-upload first, then live w/ app-side score bug), shot
charts, minutes played, cross-season career stats, head-to-head intra-program games,
scorekeeper handoff, team media albums, self-service join requests.

### Deliberately out of scope (the reference app's big-team moat — do not chase solo)

Auto-highlight clips, AI announcer, auto-panning cameras, external camera hardware
integrations, weather, consumer paywall tiers (everything is unlocked for this program).

## Success criteria

1. Phase 1 closed beta: the client's real program is in the database — every parent, player,
   team visible in one directory. Already beats the reference app on the #1 ask.
2. Phase 2: coaches score real games offline in gyms; parents follow live; nothing is lost.
3. Phase 3: live on the App Store and Google Play under the client's own accounts.
4. Phase 4: the next season's registration + dues run entirely in-app.
5. The client can reconfigure his program (teams, people, roles, forms) without calling Max.

## Constraints

- Solo developer + agent delegation (see CLAUDE.md). Mainstream, hireable stack for handoff.
- All infra accounts client-owned from day 1 (stores, Supabase, Stripe, Cloudflare, Expo).
- Legal guardrails in `docs/COMPLIANCE.md` are product requirements, not suggestions.
