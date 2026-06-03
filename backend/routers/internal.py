"""
Internal sync endpoints — callable only by Railway cron jobs.

Protected by INTERNAL_API_KEY header (second layer of defense; Railway
Private Networking is the primary isolation mechanism).
"""

from __future__ import annotations

import datetime
import os
from typing import Any

import pytz
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from supabase import Client

from database import get_supabase
from services.japanese_data import mlb_photo_url, player_name_ja, team_name_from_id, team_name_ja
from services.baseball_savant import fetch_statcast_aggregated
from services.mlb_api import (
    detect_japanese_player_games,
    fetch_boxscore_batting,
    fetch_japanese_players,
    fetch_live_game,
    fetch_player_game_log,
    fetch_player_stats,
    fetch_schedule,
)

router = APIRouter(prefix="/internal", tags=["internal"])

JST = pytz.timezone("Asia/Tokyo")


def _verify_internal_key(x_internal_api_key: str = Header(...)) -> None:
    """Dependency: reject requests with an invalid INTERNAL_API_KEY header."""
    expected: str = os.environ.get("INTERNAL_API_KEY", "")
    if not expected or x_internal_api_key != expected:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid internal API key."},
        )


# ---------------------------------------------------------------------------
# POST /internal/sync/players
# ---------------------------------------------------------------------------


@router.post("/sync/players")
async def sync_players(
    request: Request,
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Sync Japanese players from the MLB Stats API into the players table.

    Upserts on primary key (id). Run weekly and at season start.
    """
    season: int = datetime.datetime.now(JST).year
    players: list[dict[str, Any]] = await fetch_japanese_players(season)

    if not players:
        return {"synced": 0, "message": "No Japanese players returned from MLB API."}

    rows: list[dict[str, Any]] = []
    for p in players:
        # Prefer name from API response; fall back to ID-based lookup.
        # The bulk endpoint often omits name, returning only {id, link}.
        team_en: str = p["currentTeam"]
        if not team_en and p.get("currentTeamId"):
            team_en, team_ja = team_name_from_id(p["currentTeamId"])
        else:
            team_ja = team_name_ja(team_en)

        rows.append(
            {
                "id": p["id"],
                "names": {"en": p["fullName"], "ja": player_name_ja(p["id"])},
                "team": {"en": team_en, "ja": team_ja},
                "position": p["position"],
                "is_japanese": True,
                "active": p["active"],
                "photo_url": mlb_photo_url(p["id"]),
            }
        )

    # Upsert in batches of 100 to avoid request size limits.
    batch_size = 100
    total_upserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase.table("players").upsert(batch, on_conflict="id").execute()
        total_upserted += len(batch)

    return {"synced": total_upserted}


# ---------------------------------------------------------------------------
# POST /internal/sync/schedule
# ---------------------------------------------------------------------------


@router.post("/sync/schedule")
async def sync_schedule(
    request: Request,
    date: str | None = None,
    days_ahead: int = 7,
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Sync schedule and populate game_players junction table.

    Run daily at 6:00 JST. Syncs the base date plus the next `days_ahead`
    days so upcoming scheduled games (and their start times) are browseable.

    - ?date=YYYY-MM-DD : base date (defaults to today JST). Used for backfill.
    - ?days_ahead=N    : also sync the next N days (default 7, capped at 14).
    """
    if date is not None:
        try:
            base_date = datetime.date.fromisoformat(date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_REQUEST", "message": "date must be YYYY-MM-DD."},
            )
    else:
        base_date = datetime.datetime.now(JST).date()

    # Clamp the look-ahead window to a sane range.
    days_ahead = max(0, min(days_ahead, 14))

    # Fetch the Japanese player roster once — it is reused for every date.
    jp_response = (
        supabase.table("players")
        .select("id")
        .eq("is_japanese", True)
        .execute()
    )
    japanese_player_ids: set[str] = {
        row["id"] for row in (jp_response.data or [])
    }

    total_games = 0
    total_game_players = 0

    for offset in range(days_ahead + 1):
        game_date = base_date + datetime.timedelta(days=offset)
        date_str: str = game_date.isoformat()

        schedule: list[dict[str, Any]] = await fetch_schedule(date_str)
        if not schedule:
            continue

        # Upsert games — team JSONB carries id for reliable logo lookup.
        game_rows: list[dict[str, Any]] = [
            {
                "id": g["gamePk"],
                "home_team": {
                    "en": g["homeTeam"],
                    "ja": team_name_ja(g["homeTeam"]),
                    "id": g.get("homeTeamId") or None,
                },
                "away_team": {
                    "en": g["awayTeam"],
                    "ja": team_name_ja(g["awayTeam"]),
                    "id": g.get("awayTeamId") or None,
                },
                "game_date": date_str,
                "game_time": g.get("gameDate") or None,
                "status": g["status"],
                "venue": g["venue"],
            }
            for g in schedule
        ]
        supabase.table("games").upsert(game_rows, on_conflict="id").execute()
        total_games += len(game_rows)

        pairs: list[tuple[str, str]] = await detect_japanese_player_games(
            schedule, japanese_player_ids
        )
        gp_rows: list[dict[str, Any]] = [
            {"game_id": game_pk, "player_id": player_id}
            for game_pk, player_id in pairs
        ]
        if gp_rows:
            supabase.table("game_players").upsert(
                gp_rows, on_conflict="game_id,player_id"
            ).execute()
            total_game_players += len(gp_rows)

    return {
        "games_synced": total_games,
        "game_players_synced": total_game_players,
        "days_synced": days_ahead + 1,
    }


# ---------------------------------------------------------------------------
# POST /internal/sync/stats
# ---------------------------------------------------------------------------


@router.post("/sync/stats")
async def sync_stats(
    request: Request,
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Sync current-season batting and pitching stats for all Japanese players.

    Fetches hitting and pitching stats from the MLB Stats API concurrently
    for each player, then upserts into player_stats. Run every hour.
    """
    import asyncio

    season: int = datetime.datetime.now(JST).year

    jp_response = (
        supabase.table("players")
        .select("id")
        .eq("is_japanese", True)
        .execute()
    )
    player_ids: list[str] = [row["id"] for row in (jp_response.data or [])]

    if not player_ids:
        return {"synced": 0, "message": "No Japanese players in DB."}

    stats_results: list[dict[str, Any]] = await asyncio.gather(
        *[fetch_player_stats(pid, season) for pid in player_ids]
    )

    rows: list[dict[str, Any]] = []
    for player_id, stats in zip(player_ids, stats_results):
        batting = stats.get("batting")
        pitching = stats.get("pitching")

        if batting:
            rows.append({
                "player_id": player_id,
                "season": season,
                "stat_type": "batting",
                "games": batting.get("gamesPlayed"),
                "avg": batting.get("avg"),
                "home_runs": batting.get("homeRuns"),
                "rbi": batting.get("rbi"),
                "ops": batting.get("ops"),
                "hits": batting.get("hits"),
            })

        if pitching:
            rows.append({
                "player_id": player_id,
                "season": season,
                "stat_type": "pitching",
                "games": pitching.get("gamesPlayed"),
                "era": pitching.get("era"),
                "wins": pitching.get("wins"),
                "strikeouts": pitching.get("strikeOuts"),
                "whip": pitching.get("whip"),
            })

    if not rows:
        return {"synced": 0, "message": "No stats returned from MLB API."}

    batch_size = 100
    total_upserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase.table("player_stats").upsert(
            batch, on_conflict="player_id,season,stat_type"
        ).execute()
        total_upserted += len(batch)

    return {"synced": total_upserted}


# ---------------------------------------------------------------------------
# POST /internal/sync/live
# ---------------------------------------------------------------------------


@router.post("/sync/live")
async def sync_live(
    request: Request,
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Update live game scores. Skips if no live games exist.

    Run every 2 minutes during game hours.
    """
    import asyncio

    # Find currently live games with their dates.
    live_response = (
        supabase.table("games").select("id,game_date").eq("status", "live").execute()
    )
    live_rows: list[dict[str, Any]] = live_response.data or []

    if not live_rows:
        return {"updated": 0, "game_logs_updated": 0, "message": "No live games."}

    live_game_ids: list[str] = [row["id"] for row in live_rows]
    game_date_map: dict[str, str] = {
        row["id"]: str(row["game_date"]) for row in live_rows if row.get("game_date")
    }

    # Fetch live scores and boxscores concurrently.
    live_data_list: list[dict[str, Any]]
    boxscore_lists: list[list[dict[str, Any]]]
    live_data_list, boxscore_lists = await asyncio.gather(  # type: ignore[assignment]
        asyncio.gather(*[fetch_live_game(gid) for gid in live_game_ids]),
        asyncio.gather(*[fetch_boxscore_batting(gid) for gid in live_game_ids]),
    )

    # Update game scores.
    updated_count = 0
    for live_data in live_data_list:
        if not live_data:
            continue
        game_pk: str = live_data["gamePk"]
        supabase.table("games").update(
            {
                "status": live_data["status"],
                "home_score": live_data.get("homeScore"),
                "away_score": live_data.get("awayScore"),
                "inning": live_data.get("inning"),
            }
        ).eq("id", game_pk).execute()
        updated_count += 1

    # Update game_logs with live batting stats for Japanese players.
    gp_resp = (
        supabase.table("game_players")
        .select("game_id,player_id")
        .in_("game_id", live_game_ids)
        .execute()
    )
    japanese_by_game: dict[str, set[str]] = {}
    for gp_row in gp_resp.data or []:
        japanese_by_game.setdefault(gp_row["game_id"], set()).add(gp_row["player_id"])

    game_logs_updated = 0
    for game_pk, batting_list in zip(live_game_ids, boxscore_lists):
        jp_players = japanese_by_game.get(game_pk, set())
        if not jp_players:
            continue
        game_date_str = game_date_map.get(game_pk, "")
        if not game_date_str:
            continue
        rows: list[dict[str, Any]] = [
            {
                "player_id": b["player_id"],
                "game_id": game_pk,
                "game_date": game_date_str,
                "stat_type": "batting",
                "at_bats": b["at_bats"],
                "hits": b["hits"],
                "home_runs": b["home_runs"],
                "rbi": b["rbi"],
            }
            for b in batting_list
            if b["player_id"] in jp_players
        ]
        if rows:
            supabase.table("game_logs").upsert(
                rows, on_conflict="player_id,game_id,stat_type"
            ).execute()
            game_logs_updated += len(rows)

    return {"updated": updated_count, "game_logs_updated": game_logs_updated}


# ---------------------------------------------------------------------------
# POST /internal/sync/statcast
# ---------------------------------------------------------------------------


@router.post("/sync/statcast")
async def sync_statcast(
    request: Request,
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Sync Statcast aggregated data for all Japanese batters from Baseball Savant.

    Fetches CSV data sequentially (not concurrent) to avoid rate-limiting.
    Adds a 1-second delay between players to be polite to Baseball Savant.
    Updates player_analytics table. Run weekly.
    """
    import asyncio

    season: int = datetime.datetime.now(JST).year

    jp_response = (
        supabase.table("players")
        .select("id")
        .eq("is_japanese", True)
        .execute()
    )
    player_ids: list[str] = [row["id"] for row in (jp_response.data or [])]

    if not player_ids:
        return {"synced": 0, "failed": 0, "message": "No Japanese players in DB."}

    synced = 0
    failed = 0

    for player_id in player_ids:
        statcast: dict[str, Any] = await fetch_statcast_aggregated(player_id, season)

        if not statcast:
            failed += 1
        else:
            supabase.table("player_analytics").upsert(
                {
                    "player_id": player_id,
                    "season": season,
                    "data": statcast,
                    "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                },
                on_conflict="player_id,season",
            ).execute()
            synced += 1

        # Polite delay between requests to avoid rate-limiting Baseball Savant.
        await asyncio.sleep(1)

    return {"synced": synced, "failed": failed}


# ---------------------------------------------------------------------------
# POST /internal/sync/game-logs
# ---------------------------------------------------------------------------


@router.post("/sync/game-logs")
async def sync_game_logs(
    request: Request,
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Sync per-game stats for all Japanese players into game_logs table.

    Fetches current season game log from MLB Stats API for each player.
    Upserts into game_logs table. Run hourly alongside sync/stats.
    """
    season: int = datetime.datetime.now(JST).year

    jp_response = (
        supabase.table("players")
        .select("id")
        .eq("is_japanese", True)
        .execute()
    )
    player_ids: list[str] = [row["id"] for row in (jp_response.data or [])]

    if not player_ids:
        return {"synced": 0, "failed": 0, "message": "No Japanese players in DB."}

    synced = 0
    failed = 0

    for player_id in player_ids:
        entries: list[dict[str, Any]] = await fetch_player_game_log(player_id, season)

        if not entries:
            failed += 1
            continue

        rows: list[dict[str, Any]] = []
        for entry in entries:
            game_pk: str = entry.get("game_pk", "")
            if not game_pk:
                continue
            rows.append(
                {
                    "player_id": player_id,
                    "game_id": game_pk,
                    "game_date": entry["date"],
                    "stat_type": "batting",
                    "at_bats": entry.get("at_bats"),
                    "hits": entry.get("hits"),
                    "home_runs": entry.get("home_runs"),
                    "rbi": entry.get("rbi"),
                    "avg": entry.get("avg"),
                }
            )

        if rows:
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                supabase.table("game_logs").upsert(
                    batch, on_conflict="player_id,game_id,stat_type"
                ).execute()
            synced += 1

    return {"synced": synced, "failed": failed}
