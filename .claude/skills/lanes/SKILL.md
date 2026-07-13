---
name: lanes
description: Boot or resume the courtside BE/FE lane orchestration (Herdr panes, worktrees, mailboxes) and report lane states. Use when Max says /lanes, asks to start/resume the lanes, or after a reboot/herdr restart.
---

# /lanes — PM re-entry for lane orchestration

You are PM. Full protocol: `docs/ORCHESTRATION.md`.

1. Run `bash scripts/herdr-lanes.sh --resume` (from any courtside checkout; the
   script is idempotent and never assigns tasks). If the herdr server is down it
   tells you; have Max run `herdr` in a terminal first.
2. `source ~/personal/courtside-waves/lanes.env` to load `$PM_PANE`,
   `$LANE_BE_PANE`, `$LANE_FE_PANE`.
3. Read the tail of all three mailboxes in `~/personal/courtside-waves/mail/`
   (`to-pm.md`, `to-be.md`, `to-fe.md`) and `herdr agent list`.
4. For each lane currently `working` on an assigned task, restart the backstop
   watcher as a background Bash:
   `herdr wait agent-status "$LANE_BE_PANE" --status idle --timeout 7200000`
5. Summarize for Max in plain English: each lane's state, in-flight task cards,
   unactioned handoffs in `to-pm.md`, and what you (PM) will do next. Do not
   assign new work in this skill — that is a separate PM decision.
