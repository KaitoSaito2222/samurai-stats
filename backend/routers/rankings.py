"""
Rankings endpoint.

GET /api/rankings  — batting (top 10 by OPS) and pitching (top 10 by ERA)
                     for active Japanese players in the given season.
"""

from __future__ import annotations

import datetime

import pytz
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from database import get_supabase

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/rankings", tags=["rankings"])

JST = pytz.timezone("Asia/Tokyo")


@router.get("")
@limiter.limit("60/minute")
async def get_rankings(
    request: Request,
    season: int | None = None,
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Return batting (top 10 by OPS) and pitching (top 10 by ERA) rankings
    for Japanese players in the given season (defaults to current JST year).
    """
    if season is None:
        season = datetime.datetime.now(JST).year

    # Get all active Japanese player IDs.
    players_result = (
        supabase.table("players")
        .select("id, names, team, position, photo_url")
        .eq("is_japanese", True)
        .eq("active", True)
        .execute()
    )
    players_map: dict[str, dict] = {
        p["id"]: p for p in (players_result.data or [])
    }
    player_ids: list[str] = list(players_map.keys())

    if not player_ids:
        return {"season": season, "batting": [], "pitching": []}

    # Batting rankings — top 10 by OPS where OPS is not null.
    batting_result = (
        supabase.table("player_stats")
        .select("*")
        .eq("season", season)
        .eq("stat_type", "batting")
        .in_("player_id", player_ids)
        .not_.is_("ops", "null")
        .order("ops", desc=True)
        .limit(10)
        .execute()
    )

    # Pitching rankings — top 10 by ERA (ascending) where ERA is not null.
    pitching_result = (
        supabase.table("player_stats")
        .select("*")
        .eq("season", season)
        .eq("stat_type", "pitching")
        .in_("player_id", player_ids)
        .not_.is_("era", "null")
        .order("era", desc=False)
        .limit(10)
        .execute()
    )

    def _enrich(row: dict) -> dict:
        p = players_map.get(row["player_id"], {})
        names: dict = p.get("names") or {}
        team: dict = p.get("team") or {}
        return {
            **row,
            "name_en": names.get("en", ""),
            "name_ja": names.get("ja", ""),
            "team_en": team.get("en", ""),
            "team_ja": team.get("ja", ""),
            "photo_url": p.get("photo_url"),
            "position": p.get("position"),
        }

    return {
        "season": season,
        "batting": [_enrich(r) for r in (batting_result.data or [])],
        "pitching": [_enrich(r) for r in (pitching_result.data or [])],
    }
