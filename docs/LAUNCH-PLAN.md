# Launch plan — from 2026-07-10 to public store launch

Approved 2026-07-10. This is the execution plan that carries the project from its current
state (Phase 1 largely built) through Phase 2 (scorekeeping) to Phase 3 (public launch on
both stores). It supplements `ROADMAP.md` — the roadmap defines the phases; this file
sequences the remaining work week by week and names the gates.

**Launch target: live on the App Store and Google Play the week of Oct 5–16, 2026**
(~12–13 calendar weeks, ~10–12 remaining units).

## The controlling insight

Two clocks of roughly equal length must both start the week of Jul 13:

1. **Client paperwork:** LLC → D-U-N-S (~28 days) → Apple Developer + Google Play
   **organization** accounts (~5–6 weeks total). Nothing on the dev side substitutes for it.
2. **Phase 2 scorekeeping build:** ~7–8 weeks.

Started together, neither is the long pole. **Alarm date: Aug 22** — if the D-U-N-S hasn't
issued by then, the launch window formally moves, and the client hears it framed as his lever.

## Week-by-week

### Week 0 (Jul 13–17) — Unblockers
| # | Item | Owner |
|---|------|-------|
| 1 | Client sit-down day 1: confirm LLC, file D-U-N-S same day, collect 3–5 app-name candidates (→ trademark knockout wks 1–2, USPTO filing ~$350 by wk 3) | Max + client |
| 2 | EAS pipeline: `eas.json` (development/preview/production + Update channels). Interim distribution: Android internal APK + iOS via Max's personal Apple membership. Store apps created fresh under client org accounts in August. Retire `demo/sdk54` once a real channel exists | PM-only |
| 3 | CI hardening: RLS tests against `supabase start`, `supabase gen types` drift check, lint — lands before any new agent waves | agent task |
| 4 | Team-delete → archive (`archived_at`, RLS filtering, chat history preserved) — SafeSport gate before real data | agent, PM-reviewed |
| 5 | Token freeze: tokenize inline `#208AEF` into `theme.ts` — not a design pass, just the token layer | agent (mechanical) |

### Weeks 1–2 — Phase-1 close-out + design wave 1
- Working session (PM + client): lock the role model — owner/division_admin → one **staff
  Home** variant; parent → **family-centric Home**; 13+ player login shape defined, ships as
  a thin parent-Home variant. Wireframe per-team schedule/roster flow. Decisions frozen into
  `BACKLOG.md`.
- Phase-1 close-out wave (parallel agents, ~1.5u): CSV roster import, duplicate merge
  (PM-reviewed — touches guardianships), ICS export.
- Design wave 1 (parallel agents, against the frozen role decisions): role-based Home,
  navigation polish, team-page flow — lands right before beta users arrive.

### Week 3 — Beta seeding (M2)
- Import the client's real roster spreadsheets via CSV **with fresh parent consent**,
  including media-consent flags (so Phase 5 streaming needs no re-consent campaign).
  Run duplicate merge together; issue staff invites.
- Draft a one-page data-retention note at beta start (full written policy is Phase 3, but
  holding real minors' data with nothing written is the wrong posture under COPPA 2025).
- **M2: the client's entire program browsable in the directory on his phone. Beta live.**

### Weeks 3–9 — Phase 2 scorekeeping: spike → slice → breadth
**Sync model (decided — do not relitigate):** append-only `game_events` makes this an
idempotent **push-only outbox**, not general sync. Client ULIDs + per-game `client_seq`,
`expo-sqlite` persistence, at-least-once upload with idempotent insert, corrections as
**superseding/void events** (history never mutates — preserves the audit trail).
**Single-scorer-per-game advisory claim** deletes the multi-writer conflict class.
Reserve an optional shot-location field in the event taxonomy now (populated in Phase 6).

1. **Spike (~0.5u, PM-only, wks 3–4):** freeze the event taxonomy, then a zero-UI prototype —
   200 synthetic events → app kill → airplane mode → relaunch → reconnect → verify server
   state + derived box score on both platforms. **Go/no-go gate: nothing else in Phase 2
   starts until this passes.**
2. **Vertical slice (~1u, PM-heavy, wks 4–5):** points-only scoring UI → local log → sync →
   live feed → box score. **M3: an airplane-mode game scores and syncs to another phone.**
3. **Breadth waves A–D (~4–5u, wks 5–8, parallel agents on the frozen contract):**
   A full scoring UI (FG/FT flows, auto-prompts, fouls, TOs, subs, finalize/resume) ·
   B play-by-play edit/undo (void events) + scorer handoff · C box scores + season
   aggregates as SQL views + CSV export · D live feed polish (score bug, clock).
   **Sync-engine code stays PM-only.**
4. **Phase 2 exit test (wks 8–9):** the roadmap's own gate — full simulated game in airplane
   mode on both platforms → reconnect → box score + season aggregates correct. Coaches score
   real games. **M4.**

### Weeks 5–11 — Phase 3 launch track (parallel with Phase 2)
- **Compliance docs** (agent-drafted wks 5–7, lawyer review wks 8–10): privacy policy, COPPA
  direct notices, written data-retention policy, written security program. Lawyer lead time
  is why drafts go out in August.
- **Code items:** Declared Age Range API (TX/UT/LA 2026 laws), Apple age-rating
  questionnaire, Play Data Safety + Families audit (no device identifiers from children, no
  third-party SDKs — currently true, keep it true). Configure universal links / app links in
  `app.json` pre-launch (registration links will need them; painful to bolt on later).
- **~Aug 20:** client org accounts arrive → rebuild under client accounts, real TestFlight
  (org Play accounts skip the 12-tester/14-day rule).
- **Wk 9:** TestFlight **external** beta review — a dry run of Apple review that surfaces
  kids'-data objections while there's buffer to respond.
- **Wks 9–10:** design wave 2 (visual polish under final branding) + store assets and
  screenshots — the polish pays twice. **M5: RC build with final name and branding.**
- **Wks 10–11:** RC freeze (bug/compliance fixes only) → submit both stores. Review budget:
  Apple 2–5 days, first Play submission 7+ days, one rejection cycle priced in.
  **M6: live on both stores, Oct 5–16.**

## Explicitly post-launch (pre-launch hooks already scheduled above)
- **Phase 4 payments** (Stripe; physical-services payments are IAP-exempt — keep out of
  review scope). Hook: universal links configured pre-launch.
- **Phase 5 streaming.** Hook: media-consent flags collected at the week-3 import.
- **Phase 6** polish, shot charts, minutes played. Hook: optional shot-location event field.
- **Google/Apple OAuth** — blocked on client accounts anyway; add in the August
  account-switch window if trivial, else first post-launch update.
- **Analytics:** first-party Supabase events table or nothing. No third-party SDK ever.

## Risk register (top 5)
1. **Client paperwork slips** — the sole hard external gate. Day-1 sit-down, weekly check,
   dev never waits (interim distribution), Aug 22 alarm.
2. **Offline sync fails late** — the week-3/4 spike is a go/no-go before any scoring UI;
   push-only model; sync code PM-owned.
3. **Store rejection on kids'-data grounds** — docs early + lawyer lead time, TestFlight
   external dry run, no third-party SDKs, two-week review buffer.
4. **Demo-feedback scope creep dissolves Phase 2** — backlog graduates only at wave
   boundaries; the week-1 session drains the "discuss together" queue; new asks go to
   Phase 6 intake unless they're launch-compliance items.
5. **Quality drift under agent velocity with real minors' data** — CI hardening lands first;
   frozen contracts per wave; RLS/COPPA surface stays PM-line-reviewed.

## Milestones (client-visible, on his phone)
| M | Week | What he sees |
|---|------|--------------|
| M1 | 0 | Build installs from a real channel; team delete is archive-safe |
| M2 | 3 | His entire program in the directory; beta live |
| M3 | 4–5 | Airplane-mode game scores and syncs to another phone |
| M4 | 8–9 | Full game scored offline → live feed, box score, season stats |
| M5 | 9–10 | RC build with final name and branding |
| M6 | 12–13 | **Live on the App Store and Google Play** |
