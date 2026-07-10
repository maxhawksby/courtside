# courtside — project context

Freelance client project: custom basketball coaching app for a single program (one client).
Functional clone of GameChanger (gc.com) **plus** the differentiator GC structurally lacks:
the organization is the root entity that owns persistent person records (parents, players,
coaches), divisions, teams, and season rosters.

## Plan of record

- `docs/BRIEF.md` — product brief (what & why, feature scope, differentiator)
- `docs/ARCHITECTURE.md` — stack, data model, offline sync, RLS strategy
- `docs/ROADMAP.md` — phases 0–6 with milestones and exit criteria
- `docs/LAUNCH-PLAN.md` — approved week-by-week execution plan to public launch (Oct 2026)
- `docs/COMPLIANCE.md` — trademark/IP guardrails, COPPA (2025 amendments), SafeSport MAAPP,
  store requirements. **Read before touching auth, messaging, media, or minors' data.**
- `docs/CLIENT-KICKOFF.md` — the client's critical-path checklist (D-U-N-S, store enrollments)

## Locked decisions (do not relitigate)

- **Stack**: Expo (React Native, TypeScript) mobile app + web admin console; Supabase
  (Postgres/RLS/Auth/Realtime/Storage); Stripe (Phase 4); Cloudflare Stream (Phase 5);
  Expo Push. Monorepo: `apps/mobile`, `apps/admin`, `packages/shared`, `supabase/`.
- **Tenancy**: single org, tenant-ready — `organization_id` on every table, all RLS scoped by it.
- **Minors**: under-13s never get logins. Adult-managed player sub-profiles only (COPPA-safe
  by construction). Player logins gated 13+.
- **Scorekeeping is offline-first**: local append-only `game_events` log (SQLite), idempotent
  sync (client UUID + device_id + client_seq). Stats are always derived, never stored.
- **Naming**: never use "GameChanger"/"Game Changer"/"GC" in product names, code identifiers,
  marketing copy, or store listings. Refer to it as "the reference app" in client-facing docs.
- **Never scrape gc.com** or its API. Client data arrives via CSV/manual entry with consent.

## Delegation framework (how work gets built)

Main-loop Claude (Fable) is PM/architect/integrator. Specialized cheaper-model agents in
`.claude/agents/` do scoped work in parallel git worktrees. Operating rules:

1. Contracts first: migrations, shared types, data-access layer, and design tokens are frozen
   before a parallel wave; employees never edit contract files mid-wave.
2. Every delegated task = goal, exact files, contracts to use, acceptance criteria, out-of-scope.
3. One worktree per concurrent task; no shared files between concurrent tasks; PM owns merges.
4. Review gate: code-reviewer agent → PM integration review → end-to-end verify → merge.
5. Security stays senior: RLS, auth, payments, COPPA-adjacent code is PM-written or
   PM line-reviewed. Never delegated wholesale.

## Conventions

- Identity: personal tier (`mhawk0212@gmail.com` / `maxhawksby`) — handled by folder placement.
- Max reviews via plain-English summaries + lazygit; confirm before pushes/outward-facing acts.
