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
from schemas.games import GameDetail, GameListItem, GamePlayer

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/games", tags=["games"])

JST = pytz.timezone("Asia/Tokyo")


def today_jst() -> datetime.date:
    """Return the current calendar date in JST."""
    return datetime.datetime.now(JST).date()


def _row_to_game_list_item(
    row: dict, players: list[GamePlayer] | None = None
) -> GameListItem:
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
        japanese_players=players or [],
    )


def _fetch_games_for_date(
    supabase: Client, game_date: datetime.date
) -> list[GameListItem]:
    """Fetch games that include Japanese players on the given date."""
    date_str: str = game_date.isoformat()

    # Fetch games for the date first, then cross-reference with game_players.
    games_response = (
        supabase.table("games")
        .select("*")
        .eq("game_date", date_str)
        .execute()
    )
    all_rows: list[dict] = games_response.data or []
    if not all_rows:
        return []

    all_game_ids: list[str] = [row["id"] for row in all_rows]
    gp_ids_response = (
        supabase.table("game_players")
        .select("game_id")
        .in_("game_id", all_game_ids)
        .execute()
    )
    game_ids_with_japanese: list[str] = list({
        row["game_id"] for row in (gp_ids_response.data or [])
    })

    if not game_ids_with_japanese:
        return []

    rows: list[dict] = [r for r in all_rows if r["id"] in set(game_ids_with_japanese)]

    # Fetch Japanese players for these specific games (with player name + photo).
    game_ids_on_date: list[str] = [row["id"] for row in rows]
    gp_response = (
        supabase.table("game_players")
        .select("game_id, players(id, names, photo_url)")
        .in_("game_id", game_ids_on_date)
        .execute()
    )

    players_by_game: dict[str, list[GamePlayer]] = {}
    for gp in gp_response.data or []:
        gid: str = gp["game_id"]
        p: dict = gp.get("players") or {}
        if not p.get("id"):
            continue
        names: dict = p.get("names") or {}
        players_by_game.setdefault(gid, []).append(
            GamePlayer(
                id=p["id"],
                name_ja=names.get("ja", ""),
                name_en=names.get("en", ""),
                photo_url=p.get("photo_url"),
            )
        )

    return [
        _row_to_game_list_item(row, players_by_game.get(row["id"], []))
        for row in rows
    ]


# ---------------------------------------------------------------------------
# GET /api/games  (date-based — must come before /today and /yesterday)
# ---------------------------------------------------------------------------


@router.get("", response_model=list[GameListItem])
@limiter.limit("60/minute")
async def get_games_by_date(
    request: Request,
    date: str | None = None,
    supabase: Client = Depends(get_supabase),
) -> list[GameListItem]:
    """Return games for a given date (JST) that feature Japanese players.

    date: YYYY-MM-DD. Defaults to today JST if omitted.
    Returns an empty list (not 404) when no games are found for the date —
    this is the expected response for dates not yet synced.
    """
    if date is None:
        game_date = today_jst()
    else:
        try:
            game_date = datetime.date.fromisoformat(date)
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_REQUEST", "message": "date must be YYYY-MM-DD."},
            )
    return _fetch_games_for_date(supabase, game_date)


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
