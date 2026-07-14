#!/usr/bin/env bash
# lane-spawn.sh — spawn an EPHEMERAL lane session for exactly one task card.
# Protocol v2: lanes hold no long-lived context; everything they need is the
# charter + the task card's Context section + notes/<lane>.md. PM closes the
# session (scripts/nudge.sh <pane> "/exit") after accepting the handoff.
# Usage: scripts/lane-spawn.sh <be|fe> <CARD-ID> [model]   (model default: sonnet)
set -euo pipefail

L="${1:?usage: lane-spawn.sh <be|fe> <CARD-ID> [model]}"
CARD="${2:?usage: lane-spawn.sh <be|fe> <CARD-ID> [model]}"
MODEL="${3:-sonnet}"
WAVES="$HOME/personal/courtside-waves"
UPPER="$(echo "$L" | tr '[:lower:]' '[:upper:]')"

[[ "$L" == "be" || "$L" == "fe" ]] || { echo "lane must be be|fe" >&2; exit 1; }
[[ -f "$WAVES/tasks/$CARD.md" ]] || { echo "no task card: $WAVES/tasks/$CARD.md" >&2; exit 1; }
[[ -f "$WAVES/lanes.env" ]] || { echo "no lanes.env — run scripts/herdr-lanes.sh first" >&2; exit 1; }
source "$WAVES/lanes.env"
PANEVAR="LANE_${UPPER}_PANE"
PANE="${!PANEVAR}"

# refuse to spawn over a live session — PM must /exit it first
RUNNING="$(herdr agent list | tr '}' '\n' | { grep -F "\"pane_id\":\"$PANE\"" || true; })"
if [[ -n "$RUNNING" ]]; then
  echo "an agent is still running in $PANE — close it first: scripts/nudge.sh $PANE \"/exit\"" >&2
  exit 1
fi

herdr pane run "$PANE" "claude --model $MODEL \"You are LANE-$UPPER, an ephemeral session scoped to ONE task. Boot: read docs/orchestration/LANE-$UPPER.md (your charter), ../notes/$L.md (carried context), then execute ../tasks/$CARD.md. Do not read mailbox history beyond what the charter requires. When your handoff is appended and PM nudged, stop — PM closes this session.\""
echo "spawned LANE-$UPPER ($MODEL) in $PANE for $CARD"
