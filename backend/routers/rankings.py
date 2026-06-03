"""
Rankings endpoint.

GET /api/rankings  — batting (top 10 by OPS) and pitching (top 10 by ERA)
                     for active Japanese players in the given season,
                     plus MLB-wide leaders fetched live from MLB Stats API.
"""

from __future__ import annotations

import datetime

import pytz
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from database import get_supabase
from services.mlb_api import fetch_league_leaders

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
    """Return Japanese and MLB-wide batting/pitching rankings.

    Japanese: top 10 by OPS (batting) and ERA (pitching) from DB.
    MLB-wide: top 10 leaders from MLB Stats API (live fetch).
    """
    if season is None:
        season = datetime.datetime.now(JST).year

    # ------------------------------------------------------------------ #
    # Japanese players — from DB                                          #
    # ------------------------------------------------------------------ #
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
    ) if player_ids else type("R", (), {"data": []})()

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
    ) if player_ids else type("R", (), {"data": []})()

    def _enrich_japanese(row: dict) -> dict:
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

    japanese_batting = [_enrich_japanese(r) for r in (batting_result.data or [])]
    japanese_pitching = [_enrich_japanese(r) for r in (pitching_result.data or [])]

    # ------------------------------------------------------------------ #
    # MLB-wide leaders — from MLB Stats API                               #
    # ------------------------------------------------------------------ #
    mlb_leaders = await fetch_league_leaders(season, limit=10)

    # Cross-reference with our DB to add Japanese names where available.
    # Build a map by player_id for quick lookup.
    all_db_players_result = (
        supabase.table("players")
        .select("id, names, photo_url")
        .in_("id", [r["player_id"] for r in mlb_leaders["batting"] + mlb_leaders["pitching"]])
        .execute()
    )
    db_player_lookup: dict[str, dict] = {
        p["id"]: p for p in (all_db_players_result.data or [])
    }

    def _enrich_mlb(row: dict) -> dict:
        db = db_player_lookup.get(row["player_id"], {})
        names: dict = (db.get("names") or {}) if db else {}
        return {
            **row,
            "name_ja": names.get("ja"),
            "photo_url": db.get("photo_url") if db else None,
        }

    mlb_batting = [_enrich_mlb(r) for r in mlb_leaders["batting"]]
    mlb_pitching = [_enrich_mlb(r) for r in mlb_leaders["pitching"]]

    return {
        "season": season,
        "batting": japanese_batting,
        "pitching": japanese_pitching,
        "mlb_batting": mlb_batting,
        "mlb_pitching": mlb_pitching,
    }
