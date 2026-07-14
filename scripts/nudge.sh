#!/usr/bin/env bash
# nudge.sh — the one canonical way to deliver a line to a running Claude
# session in a herdr pane (doorbell or steer; the mail file is the message).
# Mechanics matter: `herdr agent send` writes literal text WITHOUT Enter, and
# `herdr pane run` (text + Enter) misfires against a running TUI — proven
# 2026-07-14 when nudges were silently lost and a stale composer garbled
# "/exit". So: write the text, then press Enter as a key.
# Usage: scripts/nudge.sh <pane-id> "<text>"     e.g. nudge.sh "$PM_PANE" "[LANE-BE→PM] ..."
set -euo pipefail

PANE="${1:?usage: nudge.sh <pane-id> \"<text>\"}"
TEXT="${2:?usage: nudge.sh <pane-id> \"<text>\"}"

herdr pane send-text "$PANE" "$TEXT" >/dev/null
herdr pane send-keys "$PANE" Enter >/dev/null
echo "nudged $PANE"
