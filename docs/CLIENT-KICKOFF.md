# Client Kickoff Checklist

**Give this to the client immediately — items 1–3 have ~a month of lead time and gate the
store launch.** Max can sit with him for the enrollments; they take under an hour of his
time once documents exist.

## Critical path (start today)

1. **Business entity (LLC)** — needed for organization-type store accounts (recommended so
   the program, not a person, is the seller of record).
2. **D-U-N-S number** — free from Dun & Bradstreet, required by both stores for org
   accounts. **Up to ~28 days to issue.** Apply the same day the LLC exists.
3. **Apple Developer Program — enroll as *Organization*** ($99/year, needs D-U-N-S).
   Then add Max in App Store Connect → Users and Access (Admin role). No shared passwords.
4. **Google Play Console — enroll as *Organization*** ($25 one-time, needs D-U-N-S).
   Org accounts skip the 12-testers-for-14-days rule that delays personal accounts.
   Add Max under Users & permissions (Admin).

## Accounts the client owns (Max added as developer/admin on each)

| Service | Purpose | Cost |
|---|---|---|
| Apple Developer + Play Console | app distribution | $99/yr + $25 once |
| Supabase | database/auth/realtime/storage | $0 → $25/mo at beta |
| Expo (EAS) | builds + OTA updates | free tier |
| Stripe (Phase 4) | registration payments | 2.9% + 30¢/txn |
| Cloudflare (Phase 5) | video streaming | ~$2–3/streamed game |
| Domain + Resend/Postmark | web console + transactional email | ~$15/yr + free tier |

## Naming (decide in week 1–2)

- 3–5 app-name candidates from the client. Constraint: nothing resembling
  "GameChanger"/"Game Changer"/"GC" (trademark risk — actively litigated).
- Max runs a trademark knockout search on the shortlist → USPTO filing (~$350) on the winner.
- Working codename until then: **courtside** (internal only).

## Information to collect from the client

- Program structure: divisions/age groups, number of teams, roster sizes, season calendar.
- Current data: roster/contact spreadsheets or exports (parents will re-consent at import).
- Branding: program name, logo, colors.
- The custom-feature wishlist (goes into the Phase 6 intake backlog — additive, not
  launch-blocking).
- Who besides the client gets admin: division admins? team coaches self-manage?

## Standing expectations

- Every phase ends with a build on the client's phone (TestFlight / Play internal track).
- Feature requests land in a backlog and are scheduled at phase boundaries — mid-phase scope
  changes are what kill freelance timelines.
- Deliverables at handoff: source repo, runbook, all accounts in client's name.
