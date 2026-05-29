#!/usr/bin/env bash
# Seed local dev data after `make up`.
# Waits for the backend to be healthy, reloads the PostgREST schema cache,
# then runs sync endpoints that populate the DB with real MLB data.
# Syncs the last SCHEDULE_DAYS days of game schedules so the local DB has
# recent game data without requiring manual curl calls.

set -euo pipefail

BASE="http://localhost:8000"
KEY="${INTERNAL_API_KEY:-local-internal-key}"
MAX_WAIT=120
SCHEDULE_DAYS=3  # how many past days of game schedules to seed

# ---------------------------------------------------------------------------
# Wait for backend
# ---------------------------------------------------------------------------
echo ""
echo "  ⏳  Waiting for backend (up to ${MAX_WAIT}s)..."
elapsed=0
until curl -sf -o /dev/null "${BASE}/api/players/japanese?page=1&limit=1" 2>/dev/null; do
  if [ "${elapsed}" -ge "${MAX_WAIT}" ]; then
    echo ""
    echo "  ✗  Backend did not become ready in ${MAX_WAIT}s."
    echo "     Check logs: docker compose logs backend"
    echo "     Then run manually: make seed"
    exit 1
  fi
  printf "."
  sleep 3
  elapsed=$((elapsed + 3))
done
echo " ready!"

# ---------------------------------------------------------------------------
# Reload PostgREST schema cache (fixes the race where PostgREST starts before
# migrations finish and caches a schema that lacks player_analytics, etc.)
# ---------------------------------------------------------------------------
echo "  🔄  Reloading PostgREST schema cache..."
docker compose exec -T db psql -U postgres \
  -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true
sleep 2   # give PostgREST a moment to process the NOTIFY

# ---------------------------------------------------------------------------
# Sync endpoints
# ---------------------------------------------------------------------------
_sync() {
  local label="$1"
  local path="$2"
  printf "  ▸  %-30s" "${label}..."
  local out
  if out=$(curl -sf -X POST "${BASE}/internal/${path}" \
             -H "X-Internal-API-Key: ${KEY}" 2>&1); then
    echo "${out}"
  else
    echo "FAILED — ${out}"
    echo "     (continuing; run 'make seed' to retry)"
  fi
}

_sync "Syncing Japanese players" "sync/players"
_sync "Syncing player stats"     "sync/stats"

# Sync the last SCHEDULE_DAYS days of game schedules (JST dates).
# Using TZ=Asia/Tokyo so "N days ago" resolves in JST, not UTC.
echo "  ▸  Syncing last ${SCHEDULE_DAYS} days of schedules..."
for i in $(seq $((SCHEDULE_DAYS - 1)) -1 0); do
  date_str=$(TZ="Asia/Tokyo" date -d "${i} days ago" +%Y-%m-%d 2>/dev/null \
    || TZ="Asia/Tokyo" date -v"-${i}d" +%Y-%m-%d)  # GNU date / BSD date fallback
  printf "       %s  " "${date_str}"
  out=$(curl -sf -X POST "${BASE}/internal/sync/schedule?date=${date_str}" \
         -H "X-Internal-API-Key: ${KEY}" 2>&1) && echo "${out}" || echo "FAILED — ${out}"
done

echo ""
echo "  ✅  Seed complete!"
echo "      Frontend → http://localhost:3000"
echo "      Backend  → http://localhost:8000/docs"
echo ""
