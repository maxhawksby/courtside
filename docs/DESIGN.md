# Design reference — courtside

PM-owned contract doc, same standing as ARCHITECTURE.md. Anyone building UI (LANE-FE,
screen-builder, feature-dev) reads this before their first StyleSheet. The `/frontend-design`
and `/design-review` skills defer to this file wherever it conflicts with their generic
guidance.

## 1. Audience & emotional register

Three users, three feelings:

- **Parents** — pride and trust. They are here to see their kid and to know the program
  handles their kid's data and photos safely. Warm, reassuring, zero enterprise chrome.
- **Coaches** — speed. One thumb, bad gym lighting, thirty seconds between drills. Big
  targets, obvious hierarchy, nothing precious.
- **Players (13+)** — energy and identity. Seeing themselves, their team, their numbers.

Register in one line: **game-day poster, not enterprise dashboard.** Warm, never corporate,
never childish. Basketball is the subject — its vernacular (roster, lineup, tip-off, bench)
is the copy voice; its moments (game day, a new season, a first roster spot) are the
emotional beats screens get to celebrate.

## 2. Token system (frozen contract)

Single source of truth: `apps/mobile/src/constants/theme.ts`. Mirrored for the admin app in
`apps/admin/src/app/globals.css` (Tailwind v4 `@theme` names: `bg-element`, `bg-selected`,
`text-secondary`, ...). **Inline hex outside the token file is banned.** Tokens and base
components are frozen contracts — FE lane and subagents never edit them; changes are
proposals to PM (see §5).

- **Colors** (light/dark): `text`, `background`, `backgroundElement`, `backgroundSelected`,
  `textSecondary`. Five roles, both schemes — every screen must be designed in both.
- **Brand** (scheme-independent): `primary #208AEF`, gradient stops `#3C9FFE → #0274DF`,
  `onPrimary`, `link`, `danger`, `imagePlaceholder`.
  **Provisional (PM decision 2026-07-14):** the real brand palette will be derived from
  the client's logo, arriving next development iteration. Until then `PrimaryButton`
  deliberately stays neutral (`backgroundSelected`) — do not re-propose brand color on
  buttons; the open `design_proposal` is parked, not forgotten.
- **Fonts**: platform system fonts via `Platform.select` — **by design** (native feel,
  zero font-loading cost). This overrides the generic "never system fonts" rule: type
  personality here comes from scale, weight, and spacing, not typeface.
- **Spacing**: `half:2, one:4, two:8, three:16, four:24, five:32, six:64`. Every margin,
  padding, gap, and radius comes from this scale.
- **Layout**: `MaxContentWidth 800`, `BottomTabInset` per platform.

## 3. Component idiom (match exactly)

- Function component → `const theme = useTheme()` → `StyleSheet.create` at the bottom
  using `Spacing.*`; dynamic colors passed inline from `theme.*` / `Brand.*`.
- Text is `ThemedText` with its variants — `title` 48/52 w600, `subtitle` 32/44 w600,
  `default` 16/24 w500, `small` 14/20 w500, `smallBold` 14/20 w700, `link`/`linkPrimary`,
  `code`. Surfaces are `ThemedView`.
- Reuse before invent: `ui/empty-state`, `ui/primary-button`, `ui/segmented-control`,
  `ui/collapsible`, `hint-row`. A new one-off that duplicates these is a review finding.

## 4. Where creativity lives

The token palette is deliberately quiet, so craft goes into everything the tokens don't fix:

- **Composition** — asymmetry, scale jumps between `title` and `small`, generous `Spacing.six`
  air around the focal point. One clear focal point per screen.
- **Motion** — Reanimated 4 is installed. One orchestrated entrance per screen (staggered
  `entering` reveals, list items cascading with per-index delay) beats micro-animations
  sprinkled everywhere. Excess animation reads as AI-generated.
- **States as first-class screens** — empty, loading, and error states are designed, not
  defaulted. Empty states are the warmest place in the app ("No games yet — the season
  starts here"), never a gray dash.
- **Micro-copy** — basketball-warm, active voice, consistent vocabulary. Copy near minors,
  consent, or messaging follows `docs/COMPLIANCE.md`.
- **Dark mode** — designed in both palettes every time, verified explicitly, never inherited
  and hoped for.

## 5. Known gaps + proposal path

The system is intentionally thin today. Not installed: `expo-linear-gradient`,
`react-native-svg`, `moti`, `@expo-google-fonts` (only Reanimated 4 + `expo-font`). Not in
tokens: semantic success/warning colors, elevation/shadow scale, motion duration/easing
tokens.

When a screen genuinely needs more, do not hack around it (no inline hex, no unauthorized
deps). Use the closest existing token and append a proposal block to the PM handoff:

```
design_proposal:
  missing: <token or dependency>
  screen: <where it's needed>
  proposal: <exact token name/value or package>
  fallback_used: <what shipped meanwhile>
```

## 6. Verification loop

- Compile gates: `npm run typecheck` from the worktree root + `npx expo export --platform ios`.
- Layout sanity: `npx expo start --web` (react-native-web is installed). Web preview is
  layout truth, not pixel truth — expo-glass-effect and expo-symbols won't render there.
- Pixel truth is on-device only, via `npm run dev` in the PM's checkout; flag on-device
  needs in the handoff.

## 7. Craft checklist (self-contained — for agents that can only read files)

1. Read this doc before the first StyleSheet; its tokens win over any generic taste.
2. Write a 3-5 line design brief first: mood, hierarchy, one signature moment.
3. Kill anything in the brief that is an AI default rather than a choice (cream+serif+
   terracotta, near-black+acid accent, broadsheet hairlines, purple gradients, uniform
   corners, everything centered, animation everywhere).
4. One focal point per screen; type scale does the hierarchy work.
5. Every spacing value from `Spacing.*`; no inline hex, no magic numbers.
6. All four states designed: default, empty, loading, error.
7. Both color schemes verified, not assumed.
8. One orchestrated entrance, not scattered micro-animations.
9. Copy is basketball-warm, plain, and earns its place; COMPLIANCE.md governs anything
   near minors.
10. Missing token/dep → closest token + `design_proposal` block, never a workaround.
