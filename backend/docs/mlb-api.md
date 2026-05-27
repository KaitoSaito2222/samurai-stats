# MLB Stats API

**Base URL**: `https://statsapi.mlb.com/api/v1/`
**Auth**: None required

## Getting Japanese Players
No dedicated endpoint exists. Fetch all active players and filter by `birthCountry == "Japan"`:
```
GET /sports/1/players?season={year}&gameType=R
→ Returns 450+ players, each with a birthCountry field
→ Filter for birthCountry == "Japan"
→ Store results in players table
```
**Sync schedule** (handles mid-season trades, call-ups, DFA):
- Season start: full sync
- Weekly (every Monday 9:00 JST): re-sync to catch roster changes
- Triggered manually if a known Japanese player is missing

## Player Stats
Hitting and pitching are fetched separately (matches our `stat_type` DB design):
```
GET /people/{id}/stats?stats=season&group=hitting&season={year}
GET /people/{id}/stats?stats=season&group=pitching&season={year}
GET /people/{id}/stats?stats=yearByYear&group=hitting
GET /people/{id}/gameLog
```

## Period & Trend Stats (Phase 2)

Used for detailed analysis and graph data:
```
# Stats for a specific date range (period comparison)
GET /people/{id}/stats?stats=byDateRange&group=hitting
    &startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&season={year}

# Monthly breakdown (trend graphs)
GET /people/{id}/stats?stats=byMonth&group=hitting&season={year}
GET /people/{id}/stats?stats=byMonth&group=pitching&season={year}

# Per-game log (game_logs table population)
GET /people/{id}/stats?stats=gameLog&group=hitting&season={year}
```

**"Same period last year" comparison pattern:**
```python
# Fetch both years with the same month/day range, different season param
current = GET ...&startDate=2026-05-01&endDate=2026-05-26&season=2026
last_year = GET ...&startDate=2025-05-01&endDate=2025-05-26&season=2025
```

## Schedule & Games
```
GET /schedule?sportId=1&date={YYYY-MM-DD}
GET /game/{gamePk}/feed/live
GET /game/{gamePk}/boxscore
```

## Key Mappings (API → DB)
| API field | DB column |
|---|---|
| `id` (integer) | `players.id` (stored as VARCHAR string) |
| `fullName` | `players.names->>'en'` |
| `gamePk` | `games.id` |
| `status.abstractGameState` | `games.status` — see mapping below |
| `teams.home.team.name` | `games.home_team->>'en'` |
| `teams.away.team.name` | `games.away_team->>'en'` |

### `abstractGameState` → `games.status` mapping

| MLB API `abstractGameState` | MLB API `detailedState` examples | DB `status` |
|---|---|---|
| `Preview` | `Scheduled`, `Pre-Game`, `Warmup` | `scheduled` |
| `Live` | `In Progress`, `Manager Challenge` | `live` |
| `Final` | `Final`, `Completed Early`, `Game Over` | `final` |
| `Final` | `Postponed` | `postponed` |
| `Final` | `Cancelled`, `Suspended` | `cancelled` |

```python
# services/mlb_api.py
STATUS_MAP: dict[str, str] = {
    "Preview": "scheduled",
    "Live":    "live",
}

def map_game_status(abstract: str, detailed: str) -> str:
    if abstract == "Final":
        if detailed == "Postponed":
            return "postponed"
        if detailed in ("Cancelled", "Suspended"):
            return "cancelled"
        return "final"
    return STATUS_MAP.get(abstract, "scheduled")
```

> Update `games.status` CHECK constraint to include `'postponed'` and `'cancelled'`.

## Japanese Player Game Detection
The API has no "games with Japanese players" filter. Logic in `mlb_api.py`:
1. Fetch today's schedule → get all `gamePk` values
2. Cross-reference with teams that have Japanese players on roster
3. Populate `game_players` table accordingly
