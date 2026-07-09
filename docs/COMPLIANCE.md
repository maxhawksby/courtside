# Compliance & Legal Guardrails

These are product requirements. PRs that violate them get rejected regardless of quality.
(Engineering judgment compiled from research 2026-07; not legal advice — the client should
have a lawyer sanity-check naming and the privacy policy before public launch.)

## 1. IP / trademark (cloning the reference app safely)

Re-implementing *functionality* with original code, original UI, and a non-confusing name is
lawful. The lines we never cross:

- **Naming**: nothing containing "GameChanger", "Game Changer", or "GC" in a sports-app
  context — the mark's owner (Dick's Sporting Goods) litigates actively. Before the public
  name is chosen: trademark knockout search, then USPTO filing (~$350).
- **Assets**: zero reference-app assets, icons, copy, or pixel-close screen recreations.
  Same features, our own expression.
- **Data**: never scrape gc.com or its private API (ToS prohibits bots/reverse engineering;
  scraping would also exfiltrate minors' data). The client's existing rosters migrate via
  CSV/manual re-entry with fresh parent consent.

## 2. COPPA — 2025 amendments, fully in force (compliance deadline passed April 2026)

The org-wide child database is exactly what puts this app in scope. Architecture-level
compliance:

- **Under-13s never get logins.** Players under 13 exist only as adult-managed person
  records (sub-profiles). Player accounts are gated 13+ at signup (DOB check).
- **Verifiable parental consent** collected first-party at registration — the "text-plus"
  method (sanctioned by the 2025 amendments) is the cheap, adequate default.
- **Separate opt-in** required for any third-party disclosure of child data. Default posture:
  **no third-party ad/analytics SDKs in the app at all.**
- **Written data-retention policy and written security program** are now mandatory — these
  are Phase 3 deliverables, drafted alongside the privacy policy.
- **No face-tagging / facial recognition** — facial templates are now biometric PI.
- Data minimization: collect only what a field's feature needs; every child field must have
  a reason.

## 3. SafeSport / MAAPP (youth-safety messaging)

One-on-one private coach↔minor electronic communication violates MAAPP norms. Product
enforces, by construction:

- Any coach → minor message thread automatically includes guardian visibility (parent or
  second adult on-thread). 1:1 coach↔minor DMs are not creatable.
- Messages are **soft-delete only** with an immutable audit copy; staff deletions show a
  tombstone. Communication logs are exportable (org owner).
- Out-of-hours flag (8pm–8am local) on coach→minor sends.

Marketed as a feature — no competitor sells this well.

## 4. App-store requirements (Phase 0/3 checklists)

- **Both store accounts enrolled as an organization** (needs LLC + D-U-N-S, ~28 days —
  client critical path, started day 1). Org Play accounts are exempt from the
  12-tester/14-day rule; the org (not Max) appears as seller.
- Developer access via App Store Connect roles / Play "Users & permissions" — never shared
  credentials.
- Apple: 2026 age-rating questionnaire (4+/9+/13+/16+/18+ tiers); handle the Declared Age
  Range API (Texas SB2420 live Jan 2026; Utah May 2026; Louisiana July 2026).
- Google Play: accurate Data Safety form; Families policy — never transmit device
  identifiers from children.
- Review budgets: Apple 2–5 days; first Play submission can sit 7+ days.

## 5. Media consent

`media_consents` (per child, revocable) gates any photo/video visibility anywhere in the
product — team albums, clips, streams, profile photos. No consent record → no rendering.
