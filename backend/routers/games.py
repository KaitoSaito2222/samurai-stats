"""
Game endpoints.

Route order: /today and /yesterday before /{id} to avoid FastAPI route conflicts.
"""

from __future__ import annotations

import datetime

import pytz
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from database import get_supabase
from schemas.games import GameDetail, GameListItem

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/games", tags=["games"])

JST = pytz.timezone("Asia/Tokyo")


def today_jst() -> datetime.date:
    """Return the current calendar date in JST."""
    return datetime.datetime.now(JST).date()


def _row_to_game_list_item(row: dict) -> GameListItem:
    """Convert a Supabase games row to a GameListItem."""
    home_team: dict = row.get("home_team") or {}
    away_team: dict = row.get("away_team") or {}
    return GameListItem(
        id=row["id"],
        home_team_ja=home_team.get("ja", ""),
        home_team_en=home_team.get("en", ""),
        away_team_ja=away_team.get("ja", ""),
        away_team_en=away_team.get("en", ""),
        home_score=row.get("home_score"),
        away_score=row.get("away_score"),
        inning=row.get("inning"),
        game_date=row["game_date"],
        status=row.get("status", "scheduled"),
        venue=row.get("venue"),
    )


def _fetch_games_for_date(
    supabase: Client, game_date: datetime.date
) -> list[GameListItem]:
    """Fetch games that include Japanese players on the given date."""
    # Find game IDs that have at least one Japanese player via game_players junction.
    gp_response = supabase.table("game_players").select("game_id").execute()
    game_ids_with_japanese: list[str] = [
        row["game_id"] for row in (gp_response.data or [])
    ]

    if not game_ids_with_japanese:
        return []

    date_str: str = game_date.isoformat()
    games_response = (
        supabase.table("games")
        .select("*")
        .eq("game_date", date_str)
        .in_("id", game_ids_with_japanese)
        .execute()
    )
    rows: list[dict] = games_response.data or []
    return [_row_to_game_list_item(row) for row in rows]


# ---------------------------------------------------------------------------
# GET /api/games/today
# ---------------------------------------------------------------------------


@router.get("/today", response_model=list[GameListItem])
@limiter.limit("60/minute")
async def get_today_games(
    request: Request,
    supabase: Client = Depends(get_supabase),
) -> list[GameListItem]:
    """Return today's games (JST) that feature Japanese players."""
    return _fetch_games_for_date(supabase, today_jst())


# ---------------------------------------------------------------------------
# GET /api/games/yesterday
# ---------------------------------------------------------------------------


@router.get("/yesterday", response_model=list[GameListItem])
@limiter.limit("60/minute")
async def get_yesterday_games(
    request: Request,
    supabase: Client = Depends(get_supabase),
) -> list[GameListItem]:
    """Return yesterday's games (JST) that feature Japanese players."""
    yesterday: datetime.date = today_jst() - datetime.timedelta(days=1)
    return _fetch_games_for_date(supabase, yesterday)


# ---------------------------------------------------------------------------
# GET /api/games/{id}
# ---------------------------------------------------------------------------


@router.get("/{game_id}", response_model=GameDetail)
@limiter.limit("60/minute")
async def get_game(
    request: Request,
    game_id: str,
    supabase: Client = Depends(get_supabase),
) -> GameDetail:
    """Return full details for a single game."""
    response = (
        supabase.table("games").select("*").eq("id", game_id).single().execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Game not found."},
        )

    row: dict = response.data
    home_team: dict = row.get("home_team") or {}
    away_team: dict = row.get("away_team") or {}

    return GameDetail(
        id=row["id"],
        home_team_ja=home_team.get("ja", ""),
        home_team_en=home_team.get("en", ""),
        away_team_ja=away_team.get("ja", ""),
        away_team_en=away_team.get("en", ""),
        home_score=row.get("home_score"),
        away_score=row.get("away_score"),
        inning=row.get("inning"),
        game_date=row["game_date"],
        status=row.get("status", "scheduled"),
        venue=row.get("venue"),
    )
