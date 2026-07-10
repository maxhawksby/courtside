# Handoff — next session focus: EAS builds (resume parked item 2 tail)

Written 2026-07-14 by the PM session that pushed FE-4 and landed the EAS
pipeline. Read `docs/ORCHESTRATION.md` and memories `lane-orchestration.md`,
`rg-hoops-branding.md` before driving anything.

## Where things stand

- **Pushed to origin/main (through 8cc3f38), CI green through cc13fbc; the
  8cc3f38 run was in flight at handoff time** — confirm with
  `gh run list --branch main --limit 1` from the integration worktree.
  - FE-4 teams screen craft pass (merged + pushed, reviewed, reworked)
  - EAS pipeline (merge 8cc3f38): `eas.json` dev/preview/prod profiles with
    Update channels, expo-dev-client + expo-updates, fingerprint
    runtimeVersion policy, dev-doctor pins `expo start --go` (review blocker:
    bare `expo start` flips to dev-client mode once expo-dev-client is a dep).
- **Branding is official: "R&G Hoops"** (client's coaching service R&G =
  Rise and Grind). app.json name/slug/bundle ids updated
  (slug `randg-hoops`, `com.randghoops.app`). Repo codename stays courtside.
  Memory: `rg-hoops-branding.md`.
- **EAS project**: `@imitaites-team/randg-hoops`, id
  `ecf53bbb-7784-481a-a71f-4f958dc556ed`. Max is logged in via
  `npx eas-cli` in WSL (browser login done 2026-07-14).
- **Lanes**: both idle. Mailbox decision 2026-07-14-p20 (both lanes) tells
  them: rebase onto 8cc3f38 + `npm ci` (package-lock changed). NOT yet
  acked — nudge the panes on resume (`/lanes`). Last msg ids: pm→p20,
  be→b15, fe→f03 (f-ids restarted per-day; see to-pm.md).
- **Root checkout**: still on `demo/sdk54` (unchanged, NOT rebased onto new
  main). If Max needs the phone demo before the dev client exists, do the
  rebase ritual per memory `demo-sdk54-branch-maintenance`.

## Parked (Max's direction 2026-07-14): the builds — resume here

- **Android dev-client APK**: build `f8391603-8ef1-4a82-8020-f66264484d7a`
  was RUNNING in the EAS cloud at handoff. Check result:
  `npx eas-cli build:list --limit 1` from apps/mobile (integration worktree),
  or the dashboard. If it errored, read its logs first — it was fired from
  the pre-review-fix commit (bb01e9a content; the --go/fingerprint fixes
  don't affect Android build validity, but fingerprint policy changes the
  runtime version of FUTURE builds).
- **iOS dev build for Max's iPhone**: blocked on his Apple Developer
  membership (enrollment in progress as of 2026-07-14). When active:
  `npx eas-cli device:create` (QR/UDID registration of the iPhone), then
  `npx eas-cli build --profile development --platform ios`. This unblocks:
- **Retire demo/sdk54** (task #5): only after the dev client runs on the
  phone. Flip root checkout to main, drop --go from dev-doctor, delete the
  branch (confirm with Max), `npx supabase db reset`, docs/memory sweep
  (ORCHESTRATION.md, this file, `demo-sdk54-branch-maintenance`,
  `wsl2-expo-dev-loop`). Batch the on-device verification queue into the
  first dev-client session: FE-2 archive flows + FE-4 flags (cascade feel,
  mid-list entrance delay, dark-mode danger legibility).

## Queued after that (unchanged)

- Phase-1 close-out wave (CSV roster import, duplicate merge — PM
  line-review, ICS export). Scoped, awaiting Max's go.
- Design wave 1: blocked on Max+client working session; now has a real
  brand name to design against (R&G Hoops).
- Client-side clock: D-U-N-S filing (Max+client), alarm Aug 22.

## Operational notes

- Review gate ran on the EAS branch (code-reviewer verdict merge-after-fixes;
  blocker fixed in ace39cc, fingerprint nit taken). Nothing outstanding.
- The local Supabase stack (root checkout) was untouched this session — demo
  schema still in place, no db reset needed.
- Nudges over `herdr wait`; stop watchers once handoffs arrive (see
  operational-lesson block in memory `lane-orchestration.md`).
