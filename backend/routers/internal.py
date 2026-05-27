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

from backend.database import get_supabase
from backend.services.mlb_api import (
    detect_japanese_player_games,
    fetch_japanese_players,
    fetch_live_game,
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

    rows: list[dict[str, Any]] = [
        {
            "id": p["id"],
            "names": {"en": p["fullName"], "ja": ""},
            "team": {"en": p["currentTeam"], "ja": ""},
            "position": p["position"],
            "is_japanese": True,
            "active": p["active"],
        }
        for p in players
    ]

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
    _: None = Depends(_verify_internal_key),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Sync today's schedule and populate game_players junction table.

    Run daily at 6:00 JST.
    """
    today: datetime.date = datetime.datetime.now(JST).date()
    date_str: str = today.isoformat()

    schedule: list[dict[str, Any]] = await fetch_schedule(date_str)
    if not schedule:
        return {"games_synced": 0, "game_players_synced": 0}

    # Upsert games.
    game_rows: list[dict[str, Any]] = [
        {
            "id": g["gamePk"],
            "home_team": {"en": g["homeTeam"], "ja": ""},
            "away_team": {"en": g["awayTeam"], "ja": ""},
            "game_date": date_str,
            "status": g["status"],
            "venue": g["venue"],
        }
        for g in schedule
    ]
    supabase.table("games").upsert(game_rows, on_conflict="id").execute()

    # Determine which Japanese players appear in today's games.
    jp_response = (
        supabase.table("players")
        .select("id")
        .eq("is_japanese", True)
        .execute()
    )
    japanese_player_ids: set[str] = {
        row["id"] for row in (jp_response.data or [])
    }

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

    return {"games_synced": len(game_rows), "game_players_synced": len(gp_rows)}


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
    # Find currently live games.
    live_response = (
        supabase.table("games").select("id").eq("status", "live").execute()
    )
    live_game_ids: list[str] = [
        row["id"] for row in (live_response.data or [])
    ]

    if not live_game_ids:
        return {"updated": 0, "message": "No live games."}

    import asyncio

    updated_count = 0
    live_data_list: list[dict[str, Any]] = await asyncio.gather(
        *[fetch_live_game(gid) for gid in live_game_ids]
    )

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

    return {"updated": updated_count}
