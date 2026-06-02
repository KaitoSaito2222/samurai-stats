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

## Splits & Monthly Stats (implemented)

Used by `GET /api/players/{id}/analytics`. Results cached in-memory for 1 hour.

```
# Situational splits (vs LHP/RHP, Home/Away, Day/Night)
GET /people/{id}/stats?stats=splits&group=hitting&season={year}&sitCodes=vl,vr,h,a,d,n
→ sitCodes: vl=vs_left, vr=vs_right, h=home, a=away, d=day, n=night
→ Each split returns: plateAppearances, avg (string ".342"), ops, homeRuns

# Monthly breakdown (trend graphs)
GET /people/{id}/stats?stats=byMonth&group=hitting&season={year}
GET /people/{id}/stats?stats=byMonth&group=pitching&season={year}
→ Returns splits array with month (string "4") and stat dict
```

> avg and ops come back as strings (".342") — convert with `float(val) if val else None`.
> Implemented in `services/mlb_api.py`: `fetch_player_splits()`, `fetch_player_monthly()`.

## Baseball Savant (Statcast) — implemented

Statcast data is fetched from Baseball Savant, **not** the MLB Stats API.

```
Base URL: https://baseballsavant.mlb.com
Endpoint: GET /statcast_search/csv?player_id={id}&type=batter&year={season}&player_type=batter
Auth: None required
Timeout: 30s
User-Agent: Mozilla/5.0 (compatible; SamuraiStats/1.0)
```

Key CSV columns used:

| Column | Description |
|---|---|
| `launch_speed` | Exit velocity (mph) |
| `launch_angle` | Launch angle (degrees) |
| `launch_speed_angle` | `6` = barrel classification |
| `estimated_ba_using_speedangle` | xBA |
| `estimated_slg_using_speedangle` | xSLG |
| `pitch_type` | Pitch type code (FF, SL, CH...) |
| `zone` | 1-14; use 1-9 for in-zone heatmap |
| `events` | PA-ending outcome (single, home_run, strikeout...) |
| `description` | Pitch outcome (swinging_strike, foul...) |

**Aggregation**: `services/baseball_savant.py::_aggregate()` processes all rows and returns:
- `exit_velocity_avg`, `launch_angle_avg`, `barrel_rate`, `hard_hit_rate`, `xba`, `xslg`
- `pitch_splits`: grouped by pitch_type (PA ≥ 5), with avg/whiff_rate/hr/k
- `zone_stats`: zones 1-9, PA and avg per zone

Results stored in `player_analytics.data` JSONB. Sync via `POST /internal/sync/statcast`.

**Rate limiting**: sync fetches players **sequentially** with 1-second delay to avoid rate-limiting.

## Period & Trend Stats (pending)

```
# Stats for a specific date range (period comparison)
GET /people/{id}/stats?stats=byDateRange&group=hitting
    &startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&season={year}

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
