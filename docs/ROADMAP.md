# Roadmap

1 unit ≈ a focused solo-dev week (delegation waves compress calendar time, not units).
Total ≈ 26–34 units ≈ 6–8 calendar months to full scope. Every phase ends with something
the client can touch on his own phone.

> **Execution plan to launch:** `docs/LAUNCH-PLAN.md` (approved 2026-07-10) sequences the
> remaining work week by week through Phase 3 — target: live on both stores Oct 5–16, 2026.

## Phase 0 — Foundations & store unblocking (2u) — IN PROGRESS

**Client critical path (started day 1 — longest lead times in the project):**
LLC → D-U-N-S number (~28 days, gates both stores) → Apple Developer Program as
*organization* ($99/yr) → Google Play Console as *organization* ($25 one-time; org accounts
are exempt from the 12-tester/14-day closed-testing rule). Max added via console roles —
credentials are never shared. App name candidates → trademark knockout search → USPTO filing.
Full checklist: `docs/CLIENT-KICKOFF.md`.

**Dev track:** repo ✓ · docs ✓ · agent roster · monorepo scaffold · Supabase project ·
schema v1 + RLS · EAS pipelines · TestFlight/internal track.

**Exit criteria:** client installs the branded shell app on his phone; first vertical slice
works end-to-end (auth → create org → team → invite parent → link player → directory).

## Phase 1 — Org database + teams + scheduling + messaging (7–8u)

The differentiator ships first. Persons/households/guardianships; divisions → teams →
seasons; scoped roles; org directory (search/filter/CSV import/duplicate merge);
staff-initiated invites; adult-managed minor profiles; media-consent flags; scheduling +
RSVP + ICS; team channels/DMs with SafeSport guardrails; web admin console v1.

**Exit criteria / milestone:** closed beta with the client's real program on TestFlight +
Play internal track. The full program is browsable in one directory — already beats the
reference app on the #1 ask.

## Phase 2 — Scorekeeping + stats (6–7u)

Full basketball scoring UI (FG/FT flows, auto-prompts, fouls, TOs, subs, play-by-play edit,
game settings, finalize + resume). **Offline-first event log + sync — the project's risk
budget lives here.** Live score feed, box scores, season stats + advanced metrics, CSV export.

**Exit criteria:** a full simulated game scored in airplane mode on both platforms →
reconnect → sync, box score, and season aggregates all correct. Coaches score real games;
parents follow live.

## Phase 3 — Public launch on both stores (2–3u)

Privacy policy, COPPA notices, written retention/security docs, Apple age-rating
questionnaire (2026 tiers) + Declared Age Range API handling, Play target-audience + Data
Safety forms, store listings. Review budgets: Apple 2–5 days; first Play submission up to 7+.

**Milestone:** live on the App Store and Google Play under the client's org accounts.

## Phase 4 — Registration & payments (4–5u)

Form builder (waivers, media consent, medical, sizes), Stripe checkout (cards + ACH),
payment plans, balance reporting, registration → auto-rostering, segment messaging
("unpaid families", "all 12U parents").

**Milestone:** the client runs the next season's signups and dues entirely in-app.

## Phase 5 — Streaming & video (4–6u)

Record-to-device + upload → archive playback first; then live RTMP → Cloudflare Stream →
HLS with app-side score bug; videographer role; signed-URL privacy.

**Milestone:** grandparents watch games live from out of state.

## Phase 6 — Polish, parity extras & client's custom asks (ongoing)

Shot charts + minutes played (leapfrogs the reference app's basketball offering),
cross-season career stats, head-to-head intra-program games, scorekeeper handoff, team media
albums, self-service join requests — plus the intake process for the client's bespoke
feature requests on top of the parity baseline.

## Sequencing logic

Org database first because it's the paid differentiator and needs a season of data to shine;
scorekeeping second because it's the daily-use hook; streaming last because it's the most
expensive parity feature and record-then-upload is a cheap interim substitute.
