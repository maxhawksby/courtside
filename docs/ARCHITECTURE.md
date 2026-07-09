# Architecture

**Expo (RN, TypeScript) · Supabase (Postgres) · Stripe · Cloudflare Stream · Expo Push.**
Fixed infra ≈ $25–35/mo (Supabase Pro) + ~$2–3 per streamed game. Everything client-owned.

## Monorepo layout

```
apps/
  mobile/        # Expo app (Expo Router) — coaches, parents, players 13+
  admin/         # Web admin console (Next.js) — org configuration, CSV import, forms
packages/
  shared/        # TypeScript types, zod schemas, derived-stats functions, constants
supabase/
  migrations/    # SQL migrations — THE contract; frozen before each delegation wave
  functions/     # Edge Functions: Stripe webhooks, push fan-out, invite emails
.claude/agents/  # delegation roster (see CLAUDE.md)
```

## Mobile

- Expo SDK (New Architecture), TypeScript, Expo Router.
- EAS Build/Submit with **client-owned** store credentials (ASC API key, Play service account);
  EAS Update for OTA JS fixes between releases (free tier covers one program).
- `expo-video` for HLS playback; `expo-notifications` + Expo Push Service (one token
  abstraction over FCM/APNs); `expo-sqlite` + Drizzle for local-first data.

## Backend: Supabase

The app's core IS a relational database. Postgres over any document store — cross-team
directory queries, guardianship joins, and season history are native SQL.

- **Auth**: Supabase Auth. Adults only hold logins; minors are person records without users.
- **RBAC = Postgres RLS.** The entire permission matrix is server-side row-level security
  keyed on `organization_id` + scoped role: org owner sees all; division admin sees division;
  coach sees own team; parent sees linked players; follower sees public data. The client apps
  never enforce security, only UX. *Biggest engineering-leverage decision in the project.*
- **Realtime**: Postgres Changes on `game_events` → live score feed; channels for chat.
- **Storage**: photos/docs/clips, RLS-governed, signed URLs.
- **Edge Functions**: Stripe webhooks, push fan-out, invite + email fallback (Resend).

## Data model (schema v1)

```
organizations ─< divisions ─< teams ─< team_seasons >─ seasons
persons        # persistent, one row per human forever; no login required
users          # auth accounts (adults + players 13+), FK → persons
households ─< household_members >─ persons
guardianships  # person(guardian) ↔ person(player), relationship type, cap 5/player
roster_memberships  # person ↔ team_season: jersey #, role (player|coach|scorekeeper)
org_roles      # user ↔ scope (org|division|team): owner|admin|coach|scorekeeper|parent|follower
events         # game|practice|general: start, arrival, location, recurrence  ─< rsvps
games ─< game_events   # APPEND-ONLY play log: type, period, clock, player_id?,
                       # client_uuid, device_id, client_seq  → stats always DERIVED
channels ─< messages   # soft-delete only; immutable audit copy
registrations ─< form_responses, payments, payment_plans (Stripe ids)
media_consents # per child, revocable — gates any photo/video visibility
streams        # Cloudflare video ids ↔ games
```

Rules that fall out of this model:

- `organization_id` on every table; every RLS policy starts from it (tenant-ready).
- Box scores/season stats are **views/aggregations over `game_events`** — never stored.
  Play editing and resume-scoring become ordinary inserts/updates on the log.
- Roster rollover copies `roster_memberships` links to a new `team_season`; `persons` rows
  are eternal → cross-season history is free.

## Offline scorekeeping sync (the hard problem — decided up front)

- Scoring writes to local SQLite as an append-only event log; the scoring UI reads
  local-first **always**, so online and offline are the same code path.
- Sync pushes queued events; idempotency via client-generated UUID + `device_id` +
  `client_seq` (server upserts on conflict-do-nothing).
- One designated scorekeeper owns a game's log → conflicts structurally rare. Resume/handoff
  requires a synced log first (the reference app's own rule — copy it).
- Rosters/schedule cached locally read-only for offline viewing.
- Escape hatch if non-scoring sync grows painful: PowerSync as a managed bolt-on. Do not
  hand-roll general sync.

## Video (Phase 5)

- Step 1: record-to-device → upload → Cloudflare Stream → HLS archive playback
  (solves bad gym Wi-Fi and ships value early).
- Step 2: live RTMP ingest → Cloudflare Stream → HLS in `expo-video`.
- Score bug rendered **app-side** from the realtime feed — no server compositing, ever.
- Signed URLs enforce team privacy. ~$2.40 per 2-hr game with 20 viewers.

## Payments (Phase 4)

Stripe hosted checkout + webhooks in Edge Functions (minimal PCI scope). Cards + ACH,
payment plans, sibling discounts, fee pass-through option.

## Security & compliance invariants (enforced in code review)

- No third-party analytics/ad SDK may ever receive minors' data (COPPA). Default: none at all.
- Coach ↔ minor DMs impossible without guardian visibility; messages soft-delete only.
- `media_consents` checked before rendering any child photo/video anywhere.
- RLS policy changes are PM-written or PM line-reviewed. See `docs/COMPLIANCE.md`.
