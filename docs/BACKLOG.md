# Backlog

Running list of requested changes, mostly from demo feedback. Plain-English, newest
feedback first. Items graduate from here into build waves.

## From the first demo walkthrough (2026-07-10)

### Shipped in the demo-feedback-1 wave

- **Tab bar redone** — five tabs with Home in the middle: Teams, Directory, Home,
  Events, Chat. Icons added. Settings left the tab bar and is now a gear in the
  top-right of Home.
- **Login screen role tabs** — Coaches / Players / Parents tabs at the bottom of the
  sign-in screen. For now these just set the tone (everyone still signs in the same
  way); they'll matter more once Google/Apple sign-in and role-based views land.
- **Delete team** — owners and division admins can delete a team from its page, with
  a confirmation warning. It permanently removes the team's seasons, rosters,
  schedule, games, and chat history — fine for beta test data.
- **Households button** — now a visible button on the Directory screen (was a small
  header link). Household list is alphabetical by family name.

### To discuss together (next working session)

- **Role-based layouts** — what an admin sees vs a parent vs a player, on Home and
  elsewhere. Needs a decision first: "player" isn't a login role today — players are
  roster records, under-13s never get logins (by design, COPPA), and 13+ player
  logins need a defined shape. Same for what "admin" means (owner vs division admin).
- **Home screen content** — what actually belongs on Home (today it's near-empty).
  Depends on the role-based layout decision.
- **Per-team schedule & roster flow** — wireframe the team page together: what adding
  a schedule to a team looks like, and refinements to the add-roster flow.

### Blocked / scheduled for later

- **Google / Apple sign-in** — needs OAuth credentials, which come with the client's
  Apple Developer and Google Play organization accounts (see CLIENT-KICKOFF critical
  path). Revisit as soon as those exist.
- **Archive teams instead of delete** — before real season data exists, team removal
  must switch from permanent delete to archive: deleting currently takes chat history
  with it, and message history is part of the SafeSport audit trail. Fine only while
  everything is test data.
- **Demo-branch icon swap** — tab and gear icons use `expo-symbols` (the SDK 57
  standard). The SDK-54 demo branch swaps symbol icons for Ionicons in its pin
  commit; that swap now covers these new icons too, and goes away when the demo
  branch retires.
