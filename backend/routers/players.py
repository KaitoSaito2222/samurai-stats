"""
Player endpoints.

Route order matters: /japanese and /search must be defined before /{id}
so FastAPI does not match those literal path segments as player IDs.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from database import get_supabase
from schemas.players import (
    BattingStats,
    PaginatedPlayers,
    PitchingStats,
    PlayerDetail,
    PlayerListItem,
    PlayerStats,
)
from services.mlb_api import fetch_player_monthly, fetch_player_splits

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/players", tags=["players"])

FREE_PLAN_DAILY_LIMIT = 3

# In-memory cache for analytics responses.
# Key: "analytics:{player_id}:{season}"  Value: (payload, expiry_timestamp)
_analytics_cache: dict[str, tuple[Any, float]] = {}
_CACHE_TTL = 3600.0  # 1 hour


def _row_to_list_item(row: dict) -> PlayerListItem:
    """Convert a Supabase players row to a PlayerListItem."""
    names: dict = row.get("names") or {}
    team: dict = row.get("team") or {}
    return PlayerListItem(
        id=row["id"],
        name_ja=names.get("ja", ""),
        name_en=names.get("en", ""),
        team_ja=team.get("ja", ""),
        team_en=team.get("en", ""),
        position=row.get("position") or "",
        photo_url=row.get("photo_url"),
        is_japanese=row.get("is_japanese", False),
    )


# ---------------------------------------------------------------------------
# GET /api/players/japanese
# ---------------------------------------------------------------------------


@router.get("/japanese", response_model=PaginatedPlayers)
@limiter.limit("60/minute")
async def list_japanese_players(
    request: Request,
    page: int = 1,
    limit: int = 20,
    supabase: Client = Depends(get_supabase),
) -> PaginatedPlayers:
    """Return a paginated list of Japanese players from the DB."""
    effective_limit: int = min(limit, 100)
    offset: int = (page - 1) * effective_limit

    # Count total matching rows.
    count_response = (
        supabase.table("players")
        .select("id", count="exact")
        .eq("is_japanese", True)
        .execute()
    )
    total: int = count_response.count or 0

    # Fetch the page.
    data_response = (
        supabase.table("players")
        .select("*")
        .eq("is_japanese", True)
        .order("id")
        .range(offset, offset + effective_limit - 1)
        .execute()
    )
    rows: list[dict] = data_response.data or []
    items = [_row_to_list_item(row) for row in rows]

    return PaginatedPlayers(
        items=items,
        total=total,
        page=page,
        limit=effective_limit,
        has_next=(offset + effective_limit) < total,
    )


# ---------------------------------------------------------------------------
# GET /api/players/search
# ---------------------------------------------------------------------------


@router.get("/search", response_model=PaginatedPlayers)
@limiter.limit("60/minute")
async def search_players(
    request: Request,
    q: str = "",
    page: int = 1,
    limit: int = 20,
    supabase: Client = Depends(get_supabase),
) -> PaginatedPlayers:
    """Search players by name (Japanese or English) using case-insensitive matching."""
    effective_limit: int = min(limit, 100)
    offset: int = (page - 1) * effective_limit

    if not q:
        # Return all players when no query is provided.
        count_response = (
            supabase.table("players").select("id", count="exact").execute()
        )
        total: int = count_response.count or 0
        data_response = (
            supabase.table("players")
            .select("*")
            .order("id")
            .range(offset, offset + effective_limit - 1)
            .execute()
        )
    else:
        # Filter on JSONB name fields using ilike.
        # Supabase supports JSONB text extraction in filters via ->> operator.
        count_response = (
            supabase.table("players")
            .select("id", count="exact")
            .or_(f"names->>en.ilike.%{q}%,names->>ja.ilike.%{q}%")
            .execute()
        )
        total = count_response.count or 0
        data_response = (
            supabase.table("players")
            .select("*")
            .or_(f"names->>en.ilike.%{q}%,names->>ja.ilike.%{q}%")
            .order("id")
            .range(offset, offset + effective_limit - 1)
            .execute()
        )

    rows: list[dict] = data_response.data or []
    items = [_row_to_list_item(row) for row in rows]

    return PaginatedPlayers(
        items=items,
        total=total,
        page=page,
        limit=effective_limit,
        has_next=(offset + effective_limit) < total,
    )


# ---------------------------------------------------------------------------
# GET /api/players/{id}
# ---------------------------------------------------------------------------


@router.get("/{player_id}", response_model=PlayerDetail)
@limiter.limit("60/minute")
async def get_player(
    request: Request,
    player_id: str,
    supabase: Client = Depends(get_supabase),
) -> PlayerDetail:
    """Return full details for a single player."""
    response = (
        supabase.table("players")
        .select("*")
        .eq("id", player_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )

    row: dict = response.data
    names: dict = row.get("names") or {}
    team: dict = row.get("team") or {}

    return PlayerDetail(
        id=row["id"],
        name_ja=names.get("ja", ""),
        name_en=names.get("en", ""),
        team_ja=team.get("ja", ""),
        team_en=team.get("en", ""),
        position=row.get("position") or "",
        photo_url=row.get("photo_url"),
        is_japanese=row.get("is_japanese", False),
        active=row.get("active", True),
    )


# ---------------------------------------------------------------------------
# GET /api/players/{id}/stats
# ---------------------------------------------------------------------------


@router.get("/{player_id}/stats", response_model=PlayerStats)
@limiter.limit("60/minute")
async def get_player_stats(
    request: Request,
    player_id: str,
    supabase: Client = Depends(get_supabase),
) -> PlayerStats:
    """Return batting and pitching stats for a player (current season)."""
    from datetime import datetime

    import pytz

    current_season: int = datetime.now(pytz.timezone("Asia/Tokyo")).year

    # Verify the player exists.
    player_check = (
        supabase.table("players")
        .select("id")
        .eq("id", player_id)
        .single()
        .execute()
    )
    if not player_check.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )

    # Fetch all stat rows for this player in the current season.
    stats_response = (
        supabase.table("player_stats")
        .select("*")
        .eq("player_id", player_id)
        .eq("season", current_season)
        .execute()
    )
    rows: list[dict] = stats_response.data or []

    batting: BattingStats | None = None
    pitching: PitchingStats | None = None

    for row in rows:
        stat_type: str = row.get("stat_type", "")
        if stat_type == "batting":
            batting = BattingStats(
                avg=row.get("avg"),
                home_runs=row.get("home_runs"),
                rbi=row.get("rbi"),
                ops=row.get("ops"),
                hits=row.get("hits"),
                games=row.get("games"),
                season=row.get("season", current_season),
            )
        elif stat_type == "pitching":
            pitching = PitchingStats(
                era=row.get("era"),
                wins=row.get("wins"),
                strikeouts=row.get("strikeouts"),
                whip=row.get("whip"),
                innings_pitched=row.get("innings_pitched"),
                games=row.get("games"),
                season=row.get("season", current_season),
            )

    return PlayerStats(player_id=player_id, batting=batting, pitching=pitching)


# ---------------------------------------------------------------------------
# GET /api/players/{id}/analytics
# ---------------------------------------------------------------------------


@router.get("/{player_id}/analytics")
@limiter.limit("60/minute")
async def get_player_analytics(
    request: Request,
    player_id: str,
    season: int | None = None,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Return analytics data for a player: splits, monthly stats, and Statcast.

    Splits and monthly stats are fetched on-demand from the MLB Stats API and
    cached in-memory for 1 hour. Statcast data is read from the player_analytics
    table (populated by the weekly /internal/sync/statcast job).

    Query params:
        season (int, optional): MLB season year. Defaults to current JST year.
    """
    from datetime import datetime

    import pytz

    # Resolve season — default to current JST year.
    if season is None:
        season = datetime.now(pytz.timezone("Asia/Tokyo")).year

    # Verify the player exists.
    player_check = (
        supabase.table("players")
        .select("id")
        .eq("id", player_id)
        .single()
        .execute()
    )
    if not player_check.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )

    # Serve from cache if still fresh.
    cache_key: str = f"analytics:{player_id}:{season}"
    cached = _analytics_cache.get(cache_key)
    if cached is not None:
        payload, expires_at = cached
        if time.monotonic() < expires_at:
            return payload

    # Fetch splits and monthly stats concurrently from the MLB Stats API.
    splits_raw, monthly_raw = await asyncio.gather(
        fetch_player_splits(player_id, season),
        fetch_player_monthly(player_id, season),
    )

    splits: dict[str, Any] | None = splits_raw if splits_raw else None
    monthly: list[dict[str, Any]] | None = monthly_raw if monthly_raw else None

    # Fetch Statcast from the player_analytics DB table.
    analytics_result = (
        supabase.table("player_analytics")
        .select("data")
        .eq("player_id", player_id)
        .eq("season", season)
        .maybe_single()
        .execute()
    )
    statcast: dict[str, Any] | None = (
        analytics_result.data["data"] if analytics_result.data else None
    )

    response_payload: dict[str, Any] = {
        "player_id": player_id,
        "season": season,
        "splits": splits,
        "monthly": monthly,
        "statcast": statcast,
    }

    # Store in cache.
    _analytics_cache[cache_key] = (response_payload, time.monotonic() + _CACHE_TTL)

    return response_payload
