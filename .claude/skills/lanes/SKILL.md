---
name: lanes
description: Boot the courtside lane infrastructure (Herdr panes, worktrees, mailboxes, notes) and report lane state. Use when Max says /lanes, asks to start the lanes, or after a reboot/herdr restart.
---

# /lanes — PM re-entry for lane orchestration (protocol v2)

You are PM. Full protocol: `docs/ORCHESTRATION.md`. Lanes are ephemeral —
there is nothing to "resume"; sessions are spawned per task card and closed
after handoff.

1. Run `bash scripts/herdr-lanes.sh` (from any courtside checkout; idempotent,
   launches no sessions). If the herdr server is down it tells you; have Max
   run `herdr` in a terminal first.
2. `source ~/personal/courtside-waves/lanes.env` to load `$PM_PANE`,
   `$LANE_BE_PANE`, `$LANE_FE_PANE`.
3. Read the tails of the three mailboxes in `~/personal/courtside-waves/mail/`
   (they are kept small by `scripts/mail-archive.sh` — read the whole live
   file, never the archive), `~/personal/courtside-waves/notes/{be,fe}.md`,
   and `herdr agent list`.
4. Reconcile: for each lane branch, `git -C ~/personal/courtside-waves/lane-<x>
   log --oneline -1` vs main. Unactioned handoff → review it. Mid-flight card
   with a dead session → decide keep-or-reset, re-spawn with
   `scripts/lane-spawn.sh <be|fe> <CARD-ID>`. Worktrees behind main →
   `scripts/lane-sync.sh` (no mail for this; git state is the ack).
5. Summarize for Max in plain English: each lane's state, in-flight cards,
   unactioned handoffs, and what you (PM) will do next. Do not assign new work
   in this skill — that is a separate PM decision.
