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

- **Colors** (light/dark): `text`, `textSecondary`, `background`, `backgroundElement`,
  `backgroundSelected`, `border`, `tint`, `onTint`, `accent`, `gold`, `danger`,
  `success`. Twelve roles, both schemes — every screen must be designed in both.
  Light mode is a warm off-white page (`#F7F6F2`) with pure-white cards; dark mode is
  navy (`#0C1120`), never pure black, so the brand blue still reads.
- **Brand** (scheme-independent, from the R&G Hoops logo — landed 2026-07-15, resolving
  the parked 2026-07-14 decision): `primary #2148C8` (royal blue, the logo outline),
  gradient stops `#2E5AE0 → #18337F`, `onPrimary`, `link`, `orange #F08019` (the
  basketball), `gold #FDB515` (the sunburst), `danger`, `imagePlaceholder`. Prefer the
  semantic `Colors` tokens; reach for `Brand.*` only where a color must not flip with
  the scheme (hero gradient, overlays on photos, image placeholder). The FE-4 dark-mode
  danger proposal is resolved: use `theme.danger` (per-scheme) everywhere.
- **Color roles are strict.** `tint` is THE interactive color — if it's tappable and
  primary, it's blue; `accent` (orange) marks energy only (live indicators, unread
  badges, "now") and is never a button background; `gold` marks celebration only
  (records, achievements, the Home sunrise) and is never body text on a light
  background. Orange and gold never compete with blue for "press me".
- **Fonts**: platform system fonts via `Platform.select` — **by design** (native feel,
  zero font-loading cost). This overrides the generic "never system fonts" rule: type
  personality here comes from scale, weight, and spacing, not typeface.
- **Spacing**: `half:2, one:4, two:8, three:16, four:24, five:32, six:64`. Every margin,
  padding, and gap comes from this scale.
- **Radius** (`Radius.*`): `input 10`, `card 14`, `sheet 20`, `pill` for buttons and
  segmented controls. A deliberate scale — never one radius everywhere, never a magic
  number.
- **Touch** (`TouchTarget.*`): every tappable element ≥ `minimum` (44pt) in both axes;
  primary buttons are `comfortable` (50pt) tall. The audience skews older — when in
  doubt, bigger.
- **Layout**: `MaxContentWidth 800`, `BottomTabInset` per platform.

## 3. Component idiom (match exactly)

- Function component → `const theme = useTheme()` → `StyleSheet.create` at the bottom
  using `Spacing.*` / `Radius.*`; dynamic colors passed inline from `theme.*` / `Brand.*`.
- Text is `ThemedText` with its variants (prop API frozen; metrics below are the
  2026-07-15 brand scale) — `title` 48/52 w800 `Fonts.rounded`, `subtitle` 32/40 w700
  `Fonts.rounded`, `default` 17/24 w400, `small` 15/20 w500, `smallBold` 15/20 w700,
  `link`/`linkPrimary` 17/24 colored `theme.tint`, `code` mono. Titles and button labels
  speak in the rounded voice (SF Rounded on iOS); body stays the plain system face.
  Body copy never renders below 15pt.
- Buttons are pills. `PrimaryButton`: `theme.tint` background, `theme.onTint` rounded
  w700 label, `TouchTarget.comfortable` height, `Radius.pill`. Secondary treatment:
  `backgroundElement` pill with `theme.border` outline and `theme.tint` label.
  Destructive: same shape on `theme.danger`. Icons never appear without a text label
  on primary actions.
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

## 4b. Signature moment

The Home screen header carries the brand: a soft gold "sunrise" arc (react-native-svg,
no image assets) rising behind the organization greeting — the logo's sunburst, "Rise
and Grind" made literal. It appears exactly once in the app, on Home. Subtle: it sits
behind content at low saturation, never fights the text, and respects both schemes.

The logo PNG itself has a baked-in background — do not embed it in screens. A
transparent export is requested from the client; until it arrives the brand shows up
through color, shape, and the sunrise motif only.

## 5. Known gaps + proposal path

The system is intentionally thin today. Installed and authorized for UI work:
Reanimated 4, `expo-font`, `expo-linear-gradient`, `react-native-svg` (the latter two
pre-authorized by PM decision 2026-07-14). Not installed: `moti`, `@expo-google-fonts` —
the google-fonts one stays out on purpose; system fonts are a §2 design decision. Not in
tokens: semantic warning color, elevation/shadow scale, motion duration/easing tokens.

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
