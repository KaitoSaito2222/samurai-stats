#!/usr/bin/env bash
# Seed local dev data after `make up`.
# Waits for the backend to be healthy, reloads the PostgREST schema cache,
# then runs the three sync endpoints that populate the DB with real MLB data.

set -euo pipefail

BASE="http://localhost:8000"
KEY="${INTERNAL_API_KEY:-local-internal-key}"
MAX_WAIT=120

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
_sync "Syncing today's schedule" "sync/schedule"
_sync "Syncing player stats"     "sync/stats"

echo ""
echo "  ✅  Seed complete!"
echo "      Frontend → http://localhost:3000"
echo "      Backend  → http://localhost:8000/docs"
echo ""
