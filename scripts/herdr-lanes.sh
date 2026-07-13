#!/usr/bin/env bash
# herdr-lanes.sh — boot or resume the courtside lane orchestration.
# Idempotent: never assigns tasks, safe to re-run any time.
# Usage: scripts/herdr-lanes.sh [--resume]
#   (no flag)  fresh-boot lanes whose pane has no Claude running
#   --resume   restore lane sessions with `claude --continue` instead
set -euo pipefail

REPO="$HOME/personal/courtside"
WAVES="$HOME/personal/courtside-waves"
LANES=(be fe)
RESUME=0
[[ "${1:-}" == "--resume" ]] && RESUME=1

command -v herdr >/dev/null || { echo "herdr not on PATH" >&2; exit 1; }
herdr status >/dev/null 2>&1 || { echo "herdr server not running — run 'herdr' first" >&2; exit 1; }

# --- shared dirs + mailboxes -------------------------------------------------
mkdir -p "$WAVES/mail" "$WAVES/tasks"
for box in to-pm to-be to-fe; do
  [[ -f "$WAVES/mail/$box.md" ]] || printf '# Mailbox: %s (append-only; see docs/ORCHESTRATION.md)\n' "$box" > "$WAVES/mail/$box.md"
done

# --- integration worktree on main -------------------------------------------
if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WAVES/main"; then
  git -C "$REPO" worktree add "$WAVES/main" main
fi

# --- lane worktrees ----------------------------------------------------------
for L in "${LANES[@]}"; do
  WT="$WAVES/lane-$L"
  if ! git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WT"; then
    if git -C "$REPO" show-ref --verify --quiet "refs/heads/lane/$L"; then
      git -C "$REPO" worktree add "$WT" "lane/$L"
    else
      git -C "$REPO" worktree add "$WT" -b "lane/$L" main
    fi
    (cd "$WT" && npm ci)
    mkdir -p "$WT/.claude"
    cp "$REPO/.claude/settings.local.json" "$WT/.claude/settings.local.json"
  fi
done

# --- herdr workspaces (one per lane) ------------------------------------------
# workspace list/create emit JSON; extract ids with sed (no jq dependency).
ws_id_for_label() { # $1 = label (empty output when not found)
  herdr workspace list | tr '}' '\n' | { grep -F "\"label\":\"$1\"" || true; } | sed -n 's/.*"workspace_id":"\([^"]*\)".*/\1/p' | head -1
}

declare -A PANE
for L in "${LANES[@]}"; do
  LABEL="courtside-$L"
  WS="$(ws_id_for_label "$LABEL")"
  if [[ -z "$WS" ]]; then
    OUT="$(herdr workspace create --cwd "$WAVES/lane-$L" --label "$LABEL" --no-focus)"
    WS="$(printf '%s' "$OUT" | sed -n 's/.*"workspace_id":"\([^"]*\)".*/\1/p')"
  fi
  [[ -n "$WS" ]] || { echo "failed to resolve workspace for $LABEL" >&2; exit 1; }
  PANE[$L]="$WS:p1"
done

# --- pane registry -----------------------------------------------------------
# PM pane: if this script runs inside a herdr pane, that pane is PM.
# HERDR_PANE_ID is fully qualified (e.g. w2:p1).
PM_PANE_VAL="${HERDR_PANE_ID:-w2:p1}"
{
  echo "PM_PANE=$PM_PANE_VAL"
  echo "LANE_BE_PANE=${PANE[be]}"
  echo "LANE_FE_PANE=${PANE[fe]}"
} > "$WAVES/lanes.env"

# --- launch or resume lane Claudes --------------------------------------------
agent_in_pane() { # $1 = pane id -> prints agent_status or nothing
  herdr agent list | tr '}' '\n' | { grep -F "\"pane_id\":\"$1\"" || true; } | sed -n 's/.*"agent_status":"\([^"]*\)".*/\1/p' | head -1
}

for L in "${LANES[@]}"; do
  P="${PANE[$L]}"
  STATUS="$(agent_in_pane "$P")"
  UPPER="$(echo "$L" | tr '[:lower:]' '[:upper:]')"
  if [[ -z "$STATUS" ]]; then
    if [[ "$RESUME" -eq 1 ]]; then
      herdr pane run "$P" "claude --continue"
    else
      herdr pane run "$P" "claude \"You are LANE-$UPPER. Read docs/orchestration/LANE-$UPPER.md and docs/ORCHESTRATION.md, then read ../mail/to-$L.md and act on your newest unactioned message. If none, report idle to PM per the charter.\""
    fi
  fi
done

# --- summary -------------------------------------------------------------------
echo
echo "lane  pane     branch    worktree                          agent"
for L in "${LANES[@]}"; do
  printf '%-5s %-8s lane/%-4s %-33s %s\n' "$L" "${PANE[$L]}" "$L" "$WAVES/lane-$L" "$(agent_in_pane "${PANE[$L]}")"
done
echo "PM pane: $PM_PANE_VAL   registry: $WAVES/lanes.env"
