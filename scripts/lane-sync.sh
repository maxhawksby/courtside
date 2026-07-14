#!/usr/bin/env bash
# lane-sync.sh — PM-run mechanical sync of both lane worktrees onto main.
# Protocol v2: post-merge rebases are choreography, not judgment — no LLM
# session is involved and no decision/ack mail is exchanged. Git state is
# the ack. Runs npm ci only when the rebase changed package-lock.json.
# Usage: scripts/lane-sync.sh
set -euo pipefail

WAVES="$HOME/personal/courtside-waves"

for L in be fe; do
  WT="$WAVES/lane-$L"
  [[ -d "$WT/.git" || -f "$WT/.git" ]] || { echo "lane-$L: no worktree at $WT — run scripts/herdr-lanes.sh" >&2; exit 1; }
  if [[ -n "$(git -C "$WT" status --porcelain)" ]]; then
    echo "lane-$L: dirty working tree — a session may be mid-task; NOT syncing" >&2
    continue
  fi
  OLD="$(git -C "$WT" rev-parse HEAD)"
  git -C "$WT" rebase --quiet main
  NEW="$(git -C "$WT" rev-parse HEAD)"
  if [[ "$OLD" != "$NEW" ]] && ! git -C "$WT" diff --quiet "$OLD" "$NEW" -- package-lock.json; then
    echo "lane-$L: package-lock changed, running npm ci..."
    (cd "$WT" && npm ci --silent)
  fi
  echo "lane-$L: $(git -C "$WT" log --oneline -1)"
done
