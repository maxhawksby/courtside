#!/usr/bin/env bash
# mail-archive.sh — move a mailbox's content to mail/archive/, leaving only
# the header. Protocol v2: PM runs this after a merge wave once every message
# in the box is actioned; live mailboxes stay small so sessions read tails,
# not history. Archives are append-only and never re-read by lanes.
# Usage: scripts/mail-archive.sh [label]   (label default: today's date)
set -euo pipefail

WAVES="$HOME/personal/courtside-waves"
LABEL="${1:-$(date +%F)}"
mkdir -p "$WAVES/mail/archive"

for box in to-pm to-be to-fe; do
  F="$WAVES/mail/$box.md"
  [[ -f "$F" ]] || continue
  if [[ "$(wc -l < "$F")" -le 1 ]]; then
    echo "$box: already empty"
    continue
  fi
  A="$WAVES/mail/archive/$box-$LABEL.md"
  tail -n +2 "$F" >> "$A"
  printf '# Mailbox: %s (append-only; see docs/ORCHESTRATION.md)\n' "$box" > "$F"
  echo "$box: archived to mail/archive/$box-$LABEL.md"
done
