#!/usr/bin/env bash
# dev-doctor.sh - preflight + start the on-device dev loop (Expo LAN mode + local Supabase).
#
# Checks and auto-fixes every failure layer that has actually broken this loop:
#   1. WSL LAN IP drifted away from the Supabase URL baked into apps/mobile/.env
#   2. Stale Windows portproxies squatting 8081/54321 (owner shows as svchost)
#   3. Zombie Metro holding 8081 and serving stale bundles
#   4. Docker Desktop not running (Supabase lives in it)
#   5. Supabase gateway container created without its 54321 port mapping
#
# Usage: npm run dev (from apps/mobile), or bash scripts/dev-doctor.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
NETSH=/mnt/c/Windows/System32/netsh.exe

say()  { printf '\033[1;34m[dev-doctor]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[dev-doctor]\033[0m %s\n' "$*" >&2; exit 1; }

# 1. The app can only reach Supabase if the URL in .env matches the machine's LAN IP.
LAN_IP=$(hostname -I | awk '{print $1}')
ENV_HOST=$(grep -oP '(?<=EXPO_PUBLIC_SUPABASE_URL=http://)[^:/]+' "$MOBILE/.env" || true)
[ -n "$ENV_HOST" ] || fail "EXPO_PUBLIC_SUPABASE_URL missing from apps/mobile/.env"
if [ "$LAN_IP" != "$ENV_HOST" ]; then
  fail "WSL IP ($LAN_IP) != Supabase host in apps/mobile/.env ($ENV_HOST).
Either the router handed out a new IP (update .env) or mirrored networking is off:
check C:\\Users\\<you>\\.wslconfig has [wsl2] networkingMode=mirrored, then run
'wsl --shutdown' from Windows and reopen WSL."
fi

# 2. Stale portproxies reserve ports invisibly - nothing shows in ss/lsof inside WSL.
if [ -x "$NETSH" ]; then
  STALE=$("$NETSH" interface portproxy show all 2>/dev/null | awk '$2 == 8081 || $2 == 54321') || true
  if [ -n "${STALE:-}" ]; then
    echo "$STALE"
    fail "Stale Windows portproxy is squatting a dev port. Delete it from an elevated
Windows prompt:  netsh interface portproxy delete v4tov4 listenport=<port> listenaddress=0.0.0.0"
  fi
fi

# 3. A leftover Metro serves stale bundles ("my changes aren't showing"). Kill by
#    port, never by process-name pattern (pkill can match its own invoking shell).
if curl -sf -m 2 http://127.0.0.1:8081/status >/dev/null 2>&1; then
  say "Killing leftover Metro on 8081 (it would serve stale bundles)"
  fuser -k 8081/tcp >/dev/null 2>&1 || true
  sleep 1
fi

# 4. Docker Desktop hosts the Supabase containers.
docker info >/dev/null 2>&1 || fail "Docker unreachable - start Docker Desktop on Windows (WSL integration enabled)."

# 5. Supabase must answer on localhost AND the LAN IP (the phone uses the latter).
#    A kong container created while something squatted 54321 keeps NO port mapping
#    forever, even across restarts - stop/start recreates it with the mapping.
sb_health() { curl -sf -m 4 "http://$1:54321/auth/v1/health" >/dev/null 2>&1; }
if ! sb_health 127.0.0.1; then
  say "Supabase API not answering on 54321 - restarting the stack to rebind the port..."
  (cd "$ROOT" && npx supabase stop && npx supabase start) || fail "supabase start failed"
fi
sb_health 127.0.0.1 || fail "Supabase still unhealthy on localhost:54321. Check the kong
container's port column in 'docker ps' - it must show 0.0.0.0:54321->8000/tcp."
sb_health "$LAN_IP" || fail "Supabase healthy on localhost but NOT on $LAN_IP:54321.
That's the Windows networking layer - recheck portproxies (step 2) and mirrored networking."
say "Supabase healthy on $LAN_IP:54321"

# 6. LAN mode only. Do not use --tunnel: it is unnecessary under mirrored networking
#    and currently broken (Expo's anonymous ngrok pool saturated, ERR_NGROK_108).
say "Starting Expo in LAN mode - scan the QR with Expo Go on the same Wi-Fi"
cd "$MOBILE" && exec npx expo start
