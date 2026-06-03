"""
MLB Stats API service layer.

All HTTP calls use a single shared httpx.AsyncClient instance with a 10-second timeout.
Base URL: https://statsapi.mlb.com/api/v1/
No authentication is required.
"""

import datetime
import logging
import time
from typing import Any

import httpx

from services.japanese_data import is_analyzable, player_name_ja, team_name_ja

logger = logging.getLogger(__name__)

MLB_API_BASE = "https://statsapi.mlb.com/api/v1"
REQUEST_TIMEOUT = 10.0  # seconds

# Shared async client — created once at import time, reused across all calls.
_client = httpx.AsyncClient(
    base_url=MLB_API_BASE,
    timeout=REQUEST_TIMEOUT,
    headers={"Accept": "application/json"},
)

# Mapping for non-Final abstract states → DB status values.
_ABSTRACT_STATUS_MAP: dict[str, str] = {
    "Preview": "scheduled",
    "Live": "live",
}


def map_game_status(abstract: str, detailed: str) -> str:
    """Map MLB API abstractGameState + detailedState to our DB status string."""
    if abstract == "Final":
        if detailed == "Postponed":
            return "postponed"
        if detailed in ("Cancelled", "Suspended"):
            return "cancelled"
        return "final"
    if abstract == "Live":
        return "live"
    return "scheduled"


async def fetch_japanese_players(season: int) -> list[dict[str, Any]]:
    """Fetch all active players born in Japan for the given season.

    Calls GET /sports/1/players?season={season}&gameType=R and filters by
    birthCountry == "Japan".

    Returns a list of dicts with keys:
        id (str), fullName (str), currentTeam (str), position (str), active (bool)
    """
    try:
        response = await _client.get(
            "/sports/1/players",
            params={"season": season, "gameType": "R"},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_japanese_players failed: %s", exc)
        return []

    data: dict[str, Any] = response.json()
    players: list[dict[str, Any]] = data.get("people", [])

    result: list[dict[str, Any]] = []
    for player in players:
        if player.get("birthCountry") != "Japan":
            continue

        # The bulk endpoint returns currentTeam as {id, link} only — no name.
        # Resolve team name via the stable team ID mapping.
        team_info: dict[str, Any] = player.get("currentTeam", {})
        team_id: int = int(team_info.get("id", 0)) if team_info.get("id") else 0
        # name field may appear if API hydration changes in future; prefer it.
        current_team: str = team_info.get("name", "") or ""

        # Primary position code/abbreviation.
        position_info: dict[str, Any] = player.get("primaryPosition", {})
        position: str = position_info.get("abbreviation", "")

        result.append(
            {
                "id": str(player["id"]),
                "fullName": player.get("fullName", ""),
                "currentTeam": current_team,
                "currentTeamId": team_id,
                "position": position,
                "active": player.get("active", False),
            }
        )

    return result


async def _fetch_stat_group(
    player_id: str, season: int, group: str
) -> dict[str, Any] | None:
    """Fetch one stat group (hitting or pitching) for a player.

    Returns the first stats split dict, or None if unavailable.
    """
    try:
        response = await _client.get(
            f"/people/{player_id}/stats",
            params={"stats": "season", "group": group, "season": season},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_player_stats group=%s player_id=%s failed: %s", group, player_id, exc
        )
        return None

    data: dict[str, Any] = response.json()
    stats_list: list[dict[str, Any]] = data.get("stats", [])
    if not stats_list:
        return None

    splits: list[dict[str, Any]] = stats_list[0].get("splits", [])
    if not splits:
        return None

    # Return the raw stat dict from the first split (current season totals).
    return splits[0].get("stat")


async def fetch_player_stats(player_id: str, season: int) -> dict[str, Any]:
    """Fetch batting and pitching stats for a player.

    Returns:
        {"batting": dict | None, "pitching": dict | None}

    Both requests are issued concurrently.
    """
    import asyncio

    batting, pitching = await asyncio.gather(
        _fetch_stat_group(player_id, season, "hitting"),
        _fetch_stat_group(player_id, season, "pitching"),
    )
    return {"batting": batting, "pitching": pitching}


async def fetch_player_info(player_id: str) -> dict[str, Any]:
    """Fetch basic player info: name, position, team, photo URL.

    Calls GET /people/{player_id} and returns a normalized dict. Returns an
    empty dict on failure.
    """
    try:
        response = await _client.get(f"/people/{player_id}")
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_player_info player_id=%s failed: %s", player_id, exc)
        return {}

    data: dict[str, Any] = response.json()
    people: list[dict[str, Any]] = data.get("people", [])
    if not people:
        return {}

    player: dict[str, Any] = people[0]

    team_info: dict[str, Any] = player.get("currentTeam", {})
    position_info: dict[str, Any] = player.get("primaryPosition", {})

    # MLB Stats API photo URL pattern (official headshot CDN).
    photo_url: str = (
        f"https://img.mlbstatic.com/mlb-photos/image/upload/"
        f"d_people:generic:headshot:67:current.png/"
        f"w_213,q_auto:best/v1/people/{player_id}/headshot/67/current"
    )

    return {
        "id": str(player.get("id", player_id)),
        "fullName": player.get("fullName", ""),
        "firstName": player.get("firstName", ""),
        "lastName": player.get("lastName", ""),
        "position": position_info.get("abbreviation", ""),
        "positionName": position_info.get("name", ""),
        "currentTeam": team_info.get("name", ""),
        "currentTeamId": str(team_info.get("id", "")),
        "birthCountry": player.get("birthCountry", ""),
        "active": player.get("active", False),
        "photoUrl": photo_url,
    }


async def fetch_schedule(date_str: str) -> list[dict[str, Any]]:
    """Fetch the MLB schedule for a given date (YYYY-MM-DD).

    Calls GET /schedule?sportId=1&date={date_str}.

    Returns a list of normalized game dicts. Returns an empty list on failure.
    Each dict contains:
        gamePk (str), status (str), homeTeam (str), awayTeam (str),
        homeTeamId (str), awayTeamId (str), venue (str), gameDate (str)
    """
    try:
        response = await _client.get(
            "/schedule",
            params={"sportId": 1, "date": date_str},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_schedule date=%s failed: %s", date_str, exc)
        return []

    data: dict[str, Any] = response.json()
    dates: list[dict[str, Any]] = data.get("dates", [])
    if not dates:
        return []

    games: list[dict[str, Any]] = []
    for date_entry in dates:
        for game in date_entry.get("games", []):
            status_info: dict[str, Any] = game.get("status", {})
            abstract: str = status_info.get("abstractGameState", "")
            detailed: str = status_info.get("detailedState", "")

            teams: dict[str, Any] = game.get("teams", {})
            home: dict[str, Any] = teams.get("home", {})
            away: dict[str, Any] = teams.get("away", {})
            home_team: dict[str, Any] = home.get("team", {})
            away_team: dict[str, Any] = away.get("team", {})

            venue: dict[str, Any] = game.get("venue", {})

            games.append(
                {
                    "gamePk": str(game.get("gamePk", "")),
                    "status": map_game_status(abstract, detailed),
                    "homeTeam": home_team.get("name", ""),
                    "homeTeamId": str(home_team.get("id", "")),
                    "awayTeam": away_team.get("name", ""),
                    "awayTeamId": str(away_team.get("id", "")),
                    "venue": venue.get("name", ""),
                    "gameDate": game.get("gameDate", ""),
                }
            )

    return games


async def fetch_live_game(game_pk: str) -> dict[str, Any]:
    """Fetch live game state including score, inning, and status.

    Calls GET /game/{gamePk}/feed/live and extracts liveData.linescore.

    Returns a normalized dict. Returns an empty dict on failure.
    """
    try:
        response = await _client.get(f"/game/{game_pk}/feed/live")
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_live_game game_pk=%s failed: %s", game_pk, exc)
        return {}

    data: dict[str, Any] = response.json()

    game_data: dict[str, Any] = data.get("gameData", {})
    live_data: dict[str, Any] = data.get("liveData", {})
    linescore: dict[str, Any] = live_data.get("linescore", {})

    status_info: dict[str, Any] = game_data.get("status", {})
    abstract: str = status_info.get("abstractGameState", "")
    detailed: str = status_info.get("detailedState", "")

    teams: dict[str, Any] = game_data.get("teams", {})
    home_team: dict[str, Any] = teams.get("home", {})
    away_team: dict[str, Any] = teams.get("away", {})

    # Scores from linescore teams block.
    ls_teams: dict[str, Any] = linescore.get("teams", {})
    home_score: int | None = ls_teams.get("home", {}).get("runs")
    away_score: int | None = ls_teams.get("away", {}).get("runs")

    return {
        "gamePk": game_pk,
        "status": map_game_status(abstract, detailed),
        "inning": linescore.get("currentInning"),
        "inningHalf": linescore.get("inningHalf", ""),
        "homeTeam": home_team.get("name", ""),
        "homeTeamId": str(home_team.get("id", "")),
        "homeScore": home_score,
        "awayTeam": away_team.get("name", ""),
        "awayTeamId": str(away_team.get("id", "")),
        "awayScore": away_score,
        "outs": linescore.get("outs"),
    }


async def fetch_boxscore_batting(game_pk: str) -> list[dict[str, Any]]:
    """Fetch batting stats for all players from a game's boxscore.

    Calls GET /game/{gamePk}/boxscore and extracts batting lines.
    Returns only batters with at_bats > 0 (skips pitchers and DNP players).

    Returns a list of dicts with player_id, at_bats, hits, home_runs, rbi.
    Returns an empty list on failure.
    """
    try:
        response = await _client.get(f"/game/{game_pk}/boxscore")
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_boxscore_batting game_pk=%s failed: %s", game_pk, exc)
        return []

    data: dict[str, Any] = response.json()
    teams: dict[str, Any] = data.get("teams", {})

    def _as_int(value: Any) -> int:
        """Coerce an untrusted boxscore value to int, defaulting to 0."""
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    results: list[dict[str, Any]] = []
    for side in ("home", "away"):
        players: dict[str, Any] = teams.get(side, {}).get("players", {})
        for player_data in players.values():
            batting: dict[str, Any] = player_data.get("stats", {}).get("batting", {})
            if not batting:
                continue
            at_bats: int = _as_int(batting.get("atBats"))
            if at_bats == 0:
                continue
            person: dict[str, Any] = player_data.get("person", {})
            person_id: Any = person.get("id")
            if not person_id:
                continue
            results.append(
                {
                    "player_id": str(person_id),
                    "at_bats": at_bats,
                    "hits": _as_int(batting.get("hits")),
                    "home_runs": _as_int(batting.get("homeRuns")),
                    "rbi": _as_int(batting.get("rbi")),
                }
            )

    return results


_boxscore_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_BOXSCORE_CACHE_TTL = 60.0  # seconds


def _parse_boxscore(data: dict[str, Any]) -> dict[str, Any]:
    """Parse MLB API /game/{gamePk}/boxscore response into normalized shape.

    Returns a dict with 'home' and 'away' keys. Each side has:
      team_en, team_ja, batters (batting-order list), pitchers (appearance-order list).
    """
    teams: dict[str, Any] = data.get("teams", {})

    def _as_int(value: Any) -> int:
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    def _as_float(value: Any) -> float | None:
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    result: dict[str, Any] = {}

    for side in ("home", "away"):
        team_data: dict[str, Any] = teams.get(side, {})
        team_info: dict[str, Any] = team_data.get("team", {})
        team_en: str = team_info.get("name", "")
        players: dict[str, Any] = team_data.get("players", {})
        batting_order_ids: list[Any] = team_data.get("battingOrder", [])
        pitcher_ids: list[Any] = team_data.get("pitchers", [])

        batters: list[dict[str, Any]] = []
        for raw_id in batting_order_ids:
            pid = str(raw_id)
            pd: dict[str, Any] = players.get(f"ID{pid}", {})
            if not pd:
                continue
            person: dict[str, Any] = pd.get("person", {})
            batting: dict[str, Any] = pd.get("stats", {}).get("batting", {})
            season_batting: dict[str, Any] = pd.get("seasonStats", {}).get("batting", {})
            order_raw: str = pd.get("battingOrder", "")
            order: int | None = (_as_int(order_raw) // 100) if order_raw else None

            batters.append({
                "player_id": pid,
                "name_en": person.get("fullName", ""),
                "name_ja": player_name_ja(pid, person.get("fullName", "")),
                "is_analyzable": is_analyzable(pid),
                "position": pd.get("position", {}).get("abbreviation", ""),
                "batting_order": order,
                "at_bats": _as_int(batting.get("atBats")),
                "runs": _as_int(batting.get("runs")),
                "hits": _as_int(batting.get("hits")),
                "doubles": _as_int(batting.get("doubles")),
                "home_runs": _as_int(batting.get("homeRuns")),
                "rbi": _as_int(batting.get("rbi")),
                "walks": _as_int(batting.get("baseOnBalls")),
                "strikeouts": _as_int(batting.get("strikeOuts")),
                "avg": _as_float(season_batting.get("avg")),
            })

        pitchers: list[dict[str, Any]] = []
        for raw_id in pitcher_ids:
            pid = str(raw_id)
            pd = players.get(f"ID{pid}", {})
            if not pd:
                continue
            person = pd.get("person", {})
            pitching: dict[str, Any] = pd.get("stats", {}).get("pitching", {})
            season_pitching: dict[str, Any] = pd.get("seasonStats", {}).get("pitching", {})

            pitchers.append({
                "player_id": pid,
                "name_en": person.get("fullName", ""),
                "name_ja": player_name_ja(pid, person.get("fullName", "")),
                "is_analyzable": is_analyzable(pid),
                "innings_pitched": pitching.get("inningsPitched", "0.0"),
                "hits": _as_int(pitching.get("hits")),
                "runs": _as_int(pitching.get("runs")),
                "earned_runs": _as_int(pitching.get("earnedRuns")),
                "walks": _as_int(pitching.get("baseOnBalls")),
                "strikeouts": _as_int(pitching.get("strikeOuts")),
                "home_runs": _as_int(pitching.get("homeRuns")),
                "era": _as_float(season_pitching.get("era")),
            })

        result[side] = {
            "team_en": team_en,
            "team_ja": team_name_ja(team_en),
            "batters": batters,
            "pitchers": pitchers,
        }

    return result


async def fetch_boxscore(game_pk: str) -> dict[str, Any]:
    """Fetch batting order and per-player stats for both teams.

    Calls GET /game/{gamePk}/boxscore. Results are cached in memory for
    60 seconds to reduce load during live games and repeated page refreshes.

    Returns a dict with 'home' and 'away' keys (see _parse_boxscore); before
    the lineup is posted, each side's batters/pitchers lists are simply empty.
    Returns an empty dict only on HTTP failure.
    """
    cached = _boxscore_cache.get(game_pk)
    if cached and time.monotonic() - cached[0] < _BOXSCORE_CACHE_TTL:
        return cached[1]

    try:
        response = await _client.get(f"/game/{game_pk}/boxscore")
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_boxscore game_pk=%s failed: %s", game_pk, exc)
        return {}

    result = _parse_boxscore(response.json())
    _boxscore_cache[game_pk] = (time.monotonic(), result)
    return result


async def fetch_player_splits(
    player_id: str, season: int
) -> dict[str, Any]:
    """Fetch hitting splits (vs LHP/RHP, Home/Away, Day/Night).

    Calls GET /people/{id}/stats?stats=splits&group=hitting&season={year}
    &sitCodes=vl,vr,h,a,d,n

    Returns a dict with keys: vs_left, vs_right, home, away, day, night.
    Each value is {"pa": int, "avg": float|None, "ops": float|None,
    "hr": int|None} or None when data is absent.
    """
    _SITCODE_MAP: dict[str, str] = {
        "vl": "vs_left",
        "vr": "vs_right",
        "h": "home",
        "a": "away",
        "d": "day",
        "n": "night",
    }

    try:
        response = await _client.get(
            f"/people/{player_id}/stats",
            params={
                "stats": "splits",
                "group": "hitting",
                "season": season,
                "sitCodes": "vl,vr,h,a,d,n",
            },
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_player_splits player_id=%s season=%d failed: %s",
            player_id,
            season,
            exc,
        )
        return {}

    data: dict[str, Any] = response.json()
    stats_list: list[dict[str, Any]] = data.get("stats", [])
    if not stats_list:
        return {}

    splits: list[dict[str, Any]] = stats_list[0].get("splits", [])

    result: dict[str, Any] = {}
    for split in splits:
        code: str = split.get("split", {}).get("code", "")
        key = _SITCODE_MAP.get(code)
        if key is None:
            continue

        stat: dict[str, Any] = split.get("stat", {})
        avg_raw: str = stat.get("avg", "")
        ops_raw: str = stat.get("ops", "")
        result[key] = {
            "pa": stat.get("plateAppearances"),
            "avg": float(avg_raw) if avg_raw else None,
            "ops": float(ops_raw) if ops_raw else None,
            "hr": stat.get("homeRuns"),
        }

    # Fill missing keys with None.
    for key in _SITCODE_MAP.values():
        result.setdefault(key, None)

    return result


async def fetch_player_monthly(
    player_id: str, season: int, group: str = "hitting"
) -> list[dict[str, Any]]:
    """Fetch monthly hitting stats.

    Calls GET /people/{id}/stats?stats=byMonth&group={group}&season={year}

    Returns a list of dicts sorted by month:
        {"month": int, "avg": float|None, "ops": float|None,
         "hr": int|None, "games": int|None}
    """
    try:
        response = await _client.get(
            f"/people/{player_id}/stats",
            params={"stats": "byMonth", "group": group, "season": season},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_player_monthly player_id=%s season=%d group=%s failed: %s",
            player_id,
            season,
            group,
            exc,
        )
        return []

    data: dict[str, Any] = response.json()
    stats_list: list[dict[str, Any]] = data.get("stats", [])
    if not stats_list:
        return []

    splits: list[dict[str, Any]] = stats_list[0].get("splits", [])
    monthly: list[dict[str, Any]] = []
    for split in splits:
        month_raw: str = split.get("month", "")
        stat: dict[str, Any] = split.get("stat", {})
        avg_raw: str = stat.get("avg", "")
        ops_raw: str = stat.get("ops", "")
        monthly.append(
            {
                "month": int(month_raw) if month_raw else None,
                "avg": float(avg_raw) if avg_raw else None,
                "ops": float(ops_raw) if ops_raw else None,
                "hr": stat.get("homeRuns"),
                "games": stat.get("gamesPlayed"),
            }
        )

    # Sort by month, placing None-month entries last.
    monthly.sort(key=lambda x: (x["month"] is None, x["month"]))
    return monthly


async def detect_japanese_player_games(
    schedule: list[dict[str, Any]],
    japanese_player_ids: set[str],
) -> list[tuple[str, str]]:
    """Return (game_pk, player_id) tuples for games where Japanese players appear.

    Strategy:
    1. Build a set of team IDs that have at least one Japanese player by
       fetching the current roster for each unique team in the schedule.
    2. For each game, check whether the home or away team is in that set.
    3. For every matching game, emit one tuple per Japanese player on that team.

    Returns an empty list on failure.
    """
    if not schedule or not japanese_player_ids:
        return []

    # Collect all unique team IDs from today's schedule.
    team_ids: set[str] = set()
    for game in schedule:
        if game.get("homeTeamId"):
            team_ids.add(game["homeTeamId"])
        if game.get("awayTeamId"):
            team_ids.add(game["awayTeamId"])

    # Fetch rosters concurrently for all teams.
    import asyncio

    async def fetch_team_roster(team_id: str) -> tuple[str, set[str]]:
        """Return (team_id, set_of_player_ids_on_roster)."""
        try:
            response = await _client.get(
                f"/teams/{team_id}/roster",
                params={"rosterType": "active"},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("fetch_team_roster team_id=%s failed: %s", team_id, exc)
            return team_id, set()

        data: dict[str, Any] = response.json()
        roster_entries: list[dict[str, Any]] = data.get("roster", [])
        player_ids: set[str] = {
            str(entry["person"]["id"])
            for entry in roster_entries
            if "person" in entry and "id" in entry["person"]
        }
        return team_id, player_ids

    roster_results: list[tuple[str, set[str]]] = await asyncio.gather(
        *[fetch_team_roster(tid) for tid in team_ids]
    )

    # Map team_id → set of Japanese player IDs on that team's active roster.
    team_japanese_players: dict[str, set[str]] = {}
    for team_id, roster_player_ids in roster_results:
        japanese_on_team = roster_player_ids & japanese_player_ids
        if japanese_on_team:
            team_japanese_players[team_id] = japanese_on_team

    if not team_japanese_players:
        return []

    # Cross-reference games with teams that have Japanese players.
    pairs: list[tuple[str, str]] = []
    for game in schedule:
        game_pk: str = game.get("gamePk", "")
        if not game_pk:
            continue

        for side in ("homeTeamId", "awayTeamId"):
            team_id = game.get(side, "")
            if team_id in team_japanese_players:
                for player_id in team_japanese_players[team_id]:
                    pairs.append((game_pk, player_id))

    # Deduplicate while preserving order (a player could appear on both sides
    # only if data is inconsistent, but guard against it anyway).
    seen: set[tuple[str, str]] = set()
    deduped: list[tuple[str, str]] = []
    for pair in pairs:
        if pair not in seen:
            seen.add(pair)
            deduped.append(pair)

    return deduped


async def fetch_player_recent_form(
    player_id: str,
    season: int,
) -> dict[str, dict[str, Any]]:
    """Return batting stats for last 7, 14, and 30 days using byDateRange.

    Keys: "7d", "14d", "30d". Each value is a stat dict or {}.
    Uses fetch_player_period_stats internally for each window.
    """
    today = datetime.date.today()
    windows: dict[str, int] = {"7d": 7, "14d": 14, "30d": 30}

    import asyncio

    async def _fetch_window(key: str, days: int) -> tuple[str, dict[str, Any]]:
        start = today - datetime.timedelta(days=days)
        result = await fetch_player_period_stats(player_id, start, today, season)
        return key, result

    pairs = await asyncio.gather(*[_fetch_window(k, d) for k, d in windows.items()])
    return dict(pairs)


async def fetch_player_career(player_id: str) -> list[dict[str, Any]]:
    """Return year-by-year batting and pitching stats for a player.

    Calls GET /people/{player_id}/stats?stats=yearByYear&group=hitting  (batting)
    and   GET /people/{player_id}/stats?stats=yearByYear&group=pitching (pitching)
    concurrently.

    Returns a list of dicts with keys:
        season, stat_type, avg, ops, home_runs, rbi, era, wins, strikeouts, whip, games
    sorted by season ascending.
    """
    import asyncio

    async def _fetch_year_by_year(group: str) -> list[dict[str, Any]]:
        try:
            response = await _client.get(
                f"/people/{player_id}/stats",
                params={"stats": "yearByYear", "group": group},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error(
                "fetch_player_career player_id=%s group=%s failed: %s",
                player_id,
                group,
                exc,
            )
            return []

        data: dict[str, Any] = response.json()
        stats_list: list[dict[str, Any]] = data.get("stats", [])
        if not stats_list:
            return []

        splits: list[dict[str, Any]] = stats_list[0].get("splits", [])
        result: list[dict[str, Any]] = []
        for split in splits:
            season_raw: Any = split.get("season")
            if not season_raw:
                continue
            try:
                season_int = int(season_raw)
            except (ValueError, TypeError):
                continue

            stat: dict[str, Any] = split.get("stat") or {}

            if group == "hitting":
                avg_raw: str = stat.get("avg", "")
                ops_raw: str = stat.get("ops", "")
                result.append(
                    {
                        "season": season_int,
                        "stat_type": "batting",
                        "avg": float(avg_raw) if avg_raw else None,
                        "ops": float(ops_raw) if ops_raw else None,
                        "home_runs": stat.get("homeRuns"),
                        "rbi": stat.get("rbi"),
                        "games": stat.get("gamesPlayed"),
                        "era": None,
                        "wins": None,
                        "strikeouts": None,
                        "whip": None,
                    }
                )
            else:
                era_raw: str = stat.get("era", "")
                whip_raw: str = stat.get("whip", "")
                result.append(
                    {
                        "season": season_int,
                        "stat_type": "pitching",
                        "avg": None,
                        "ops": None,
                        "home_runs": None,
                        "rbi": None,
                        "games": stat.get("gamesPlayed"),
                        "era": float(era_raw) if era_raw else None,
                        "wins": stat.get("wins"),
                        "strikeouts": stat.get("strikeOuts"),
                        "whip": float(whip_raw) if whip_raw else None,
                    }
                )

        return result

    batting_seasons, pitching_seasons = await asyncio.gather(
        _fetch_year_by_year("hitting"),
        _fetch_year_by_year("pitching"),
    )

    all_seasons = batting_seasons + pitching_seasons
    all_seasons.sort(key=lambda x: x["season"])
    return all_seasons


async def fetch_player_clutch_splits(
    player_id: str, season: int
) -> dict[str, Any]:
    """Fetch clutch hitting splits: RISP and Late & Close.

    Calls GET /people/{id}/stats?stats=splits&group=hitting&season={year}
    &sitCodes=risp,late

    Returns a dict with keys: risp, late.
    Each value is {"pa": int, "avg": float|None, "ops": float|None,
    "hr": int|None} or None when data is absent.
    """
    _SITCODE_MAP: dict[str, str] = {
        "risp": "risp",
        "late": "late",
    }

    try:
        response = await _client.get(
            f"/people/{player_id}/stats",
            params={
                "stats": "splits",
                "group": "hitting",
                "season": season,
                "sitCodes": "risp,late",
            },
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_player_clutch_splits player_id=%s season=%d failed: %s",
            player_id,
            season,
            exc,
        )
        return {}

    data: dict[str, Any] = response.json()
    stats_list: list[dict[str, Any]] = data.get("stats", [])
    if not stats_list:
        return {}

    splits: list[dict[str, Any]] = stats_list[0].get("splits", [])

    result: dict[str, Any] = {}
    for split in splits:
        code: str = split.get("split", {}).get("code", "")
        key = _SITCODE_MAP.get(code)
        if key is None:
            continue

        stat: dict[str, Any] = split.get("stat", {})
        avg_raw: str = stat.get("avg", "")
        ops_raw: str = stat.get("ops", "")
        result[key] = {
            "pa": stat.get("plateAppearances"),
            "avg": float(avg_raw) if avg_raw else None,
            "ops": float(ops_raw) if ops_raw else None,
            "hr": stat.get("homeRuns"),
        }

    # Fill missing keys with None.
    for key in _SITCODE_MAP.values():
        result.setdefault(key, None)

    return result


async def fetch_player_game_log(
    player_id: str, season: int
) -> list[dict[str, Any]]:
    """Fetch per-game hitting stats for a player.

    Calls GET /people/{player_id}/stats?stats=gameLog&group=hitting&season={season}

    Returns a list of dicts with keys: date, opponent, game_pk, at_bats, hits,
    home_runs, rbi, avg sorted by date ascending.
    """
    try:
        response = await _client.get(
            f"/people/{player_id}/stats",
            params={"stats": "gameLog", "group": "hitting", "season": season},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_player_game_log player_id=%s season=%d failed: %s",
            player_id,
            season,
            exc,
        )
        return []

    data: dict[str, Any] = response.json()
    stats_list: list[dict[str, Any]] = data.get("stats", [])
    if not stats_list:
        return []

    splits: list[dict[str, Any]] = stats_list[0].get("splits", [])
    entries: list[dict[str, Any]] = []
    for split in splits:
        date_str: str = split.get("date", "")
        opponent_info: dict[str, Any] = split.get("opponent", {})
        opponent: str = opponent_info.get("name", "")
        game_info: dict[str, Any] = split.get("game", {})
        game_pk: str = str(game_info.get("gamePk", ""))
        stat: dict[str, Any] = split.get("stat", {})

        avg_raw: str = stat.get("avg", "")

        entries.append(
            {
                "date": date_str,
                "opponent": opponent,
                "game_pk": game_pk,
                "at_bats": stat.get("atBats"),
                "hits": stat.get("hits"),
                "home_runs": stat.get("homeRuns"),
                "rbi": stat.get("rbi"),
                "avg": float(avg_raw) if avg_raw else None,
            }
        )

    # Sort by date ascending.
    entries.sort(key=lambda x: x["date"])
    return entries


async def fetch_player_period_stats(
    player_id: str,
    start_date: datetime.date,
    end_date: datetime.date,
    season: int,
) -> dict[str, Any]:
    """Fetch hitting stats for a player over a date range via MLB Stats API byDateRange.

    Calls GET /people/{player_id}/stats?stats=byDateRange&group=hitting
        &startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&season={season}

    Returns the first split's stat dict, or {} if no data is available.
    Stat values (avg, ops) are returned as strings by the API and coerced to float.
    """
    start_str: str = start_date.isoformat()
    end_str: str = end_date.isoformat()

    try:
        response = await _client.get(
            f"/people/{player_id}/stats",
            params={
                "stats": "byDateRange",
                "group": "hitting",
                "startDate": start_str,
                "endDate": end_str,
                "season": season,
            },
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_player_period_stats player_id=%s season=%d start=%s end=%s failed: %s",
            player_id,
            season,
            start_str,
            end_str,
            exc,
        )
        return {}

    data: dict[str, Any] = response.json()
    stats_list: list[dict[str, Any]] = data.get("stats", [])
    if not stats_list:
        return {}

    splits: list[dict[str, Any]] = stats_list[0].get("splits", [])
    if not splits:
        return {}

    stat: dict[str, Any] = splits[0].get("stat", {})

    # avg and ops come back as strings (".342") — coerce to float.
    avg_raw: str = stat.get("avg", "")
    ops_raw: str = stat.get("ops", "")

    return {
        "avg": float(avg_raw) if avg_raw else None,
        "ops": float(ops_raw) if ops_raw else None,
        "homeRuns": stat.get("homeRuns"),
        "rbi": stat.get("rbi"),
        "hits": stat.get("hits"),
        "atBats": stat.get("atBats"),
        "plateAppearances": stat.get("plateAppearances"),
    }


# League leaders change slowly — cache for 1 hour to avoid hitting the MLB
# API on every /rankings page load.
_leaders_cache: dict[str, tuple[float, dict[str, list[dict[str, Any]]]]] = {}
_LEADERS_CACHE_TTL = 3600.0  # seconds


async def fetch_league_leaders(
    season: int,
    limit: int = 10,
) -> dict[str, list[dict[str, Any]]]:
    """Fetch MLB-wide batting and pitching leaders from MLB Stats API.

    Returns dict with keys "batting" and "pitching", each a list of dicts:
        player_id (str), name_en (str), team_en (str), team_id (int), ops/era (float)

    Results are cached in memory for 1 hour, keyed by season + limit.
    """
    cache_key: str = f"{season}:{limit}"
    cached = _leaders_cache.get(cache_key)
    if cached and time.monotonic() - cached[0] < _LEADERS_CACHE_TTL:
        return cached[1]

    try:
        response = await _client.get(
            "/stats/leaders",
            params={
                "leaderCategories": "onBasePlusSlugging,earnedRunAverage",
                "season": season,
                "leaderGameTypes": "R",
                "sportId": 1,
                "limit": limit,
            },
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("fetch_league_leaders season=%d failed: %s", season, exc)
        return {"batting": [], "pitching": []}

    data: dict[str, Any] = response.json()
    league_leaders: list[dict[str, Any]] = data.get("leagueLeaders", [])

    batting: list[dict[str, Any]] = []
    pitching: list[dict[str, Any]] = []

    for category_block in league_leaders:
        category: str = category_block.get("leaderCategory", "")
        leaders: list[dict[str, Any]] = category_block.get("leaders", [])

        for entry in leaders:
            person: dict[str, Any] = entry.get("person", {})
            team: dict[str, Any] = entry.get("team", {})
            value_str: str = str(entry.get("value", ""))

            record: dict[str, Any] = {
                "player_id": str(person.get("id", "")),
                "name_en": person.get("fullName", ""),
                "team_en": team.get("name", ""),
                "team_id": team.get("id"),
            }

            if category == "onBasePlusSlugging":
                try:
                    record["ops"] = float(value_str)
                except ValueError:
                    record["ops"] = None
                batting.append(record)

            elif category == "earnedRunAverage":
                try:
                    record["era"] = float(value_str)
                except ValueError:
                    record["era"] = None
                pitching.append(record)

    result: dict[str, list[dict[str, Any]]] = {
        "batting": batting,
        "pitching": pitching,
    }
    _leaders_cache[cache_key] = (time.monotonic(), result)
    return result
