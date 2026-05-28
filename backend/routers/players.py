"""
Player endpoints.

Route order matters: /japanese and /search must be defined before /{id}
so FastAPI does not match those literal path segments as player IDs.
"""

from __future__ import annotations

import asyncio
import datetime
import time
from typing import Any

import pytz
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from database import get_supabase
from dependencies.auth import get_current_user
from dependencies.plan import require_pro
from gotrue.types import User
from schemas.players import (
    BattingStats,
    CareerResponse,
    CareerSeasonStat,
    ClutchSplits,
    GameLogEntry,
    GameLogResponse,
    PaginatedPlayers,
    PeriodComparisonResponse,
    PeriodStats,
    PitchingStats,
    PlayerDetail,
    PlayerListItem,
    PlayerStats,
    RecentFormResponse,
    RecentFormWindow,
    SplitStat,
)
from services.mlb_api import (
    fetch_player_career,
    fetch_player_clutch_splits,
    fetch_player_game_log,
    fetch_player_monthly,
    fetch_player_period_stats,
    fetch_player_recent_form,
    fetch_player_splits,
)

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

    # Fetch splits, clutch splits, and monthly stats concurrently from the MLB Stats API.
    splits_raw, clutch_raw, monthly_raw = await asyncio.gather(
        fetch_player_splits(player_id, season),
        fetch_player_clutch_splits(player_id, season),
        fetch_player_monthly(player_id, season),
    )

    splits: dict[str, Any] | None = splits_raw if splits_raw else None
    monthly: list[dict[str, Any]] | None = monthly_raw if monthly_raw else None

    # Build ClutchSplits model from raw dict.
    clutch: ClutchSplits | None = None
    if clutch_raw:
        risp_raw: dict[str, Any] | None = clutch_raw.get("risp")
        late_raw: dict[str, Any] | None = clutch_raw.get("late")
        clutch = ClutchSplits(
            risp=SplitStat(**risp_raw) if risp_raw else None,
            late=SplitStat(**late_raw) if late_raw else None,
        )

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
        "clutch": clutch.model_dump() if clutch else None,
        "monthly": monthly,
        "statcast": statcast,
    }

    # Store in cache.
    _analytics_cache[cache_key] = (response_payload, time.monotonic() + _CACHE_TTL)

    return response_payload


# ---------------------------------------------------------------------------
# GET /api/players/{id}/period-comparison
# ---------------------------------------------------------------------------

_JST = pytz.timezone("Asia/Tokyo")


@router.get("/{player_id}/period-comparison", response_model=PeriodComparisonResponse)
@limiter.limit("60/minute")
async def get_period_comparison(
    request: Request,
    player_id: str,
    start: str | None = None,
    end: str | None = None,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> PeriodComparisonResponse:
    """Return hitting stats for a player comparing the current year vs same period last year.

    Query params:
        start (str, optional): Period start in MM-DD format, e.g. "04-01". Defaults to April 1.
        end   (str, optional): Period end in MM-DD format, e.g. "05-28". Defaults to today JST.

    Pro only. Fetches both years concurrently from the MLB Stats API byDateRange endpoint.
    """
    # Pro gate — raises 403 if user is free.
    require_pro(user, supabase)

    today_jst: datetime.date = datetime.datetime.now(_JST).date()
    current_year: int = today_jst.year

    # Parse start date (MM-DD → month, day).
    if start:
        try:
            start_parsed = datetime.datetime.strptime(start, "%m-%d").date()
            start_month, start_day = start_parsed.month, start_parsed.day
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_REQUEST",
                    "message": "start must be in MM-DD format, e.g. '04-01'.",
                },
            )
    else:
        # Default: April 1 of current year.
        start_month, start_day = 4, 1

    # Parse end date (MM-DD → month, day).
    if end:
        try:
            end_parsed = datetime.datetime.strptime(end, "%m-%d").date()
            end_month, end_day = end_parsed.month, end_parsed.day
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_REQUEST",
                    "message": "end must be in MM-DD format, e.g. '05-28'.",
                },
            )
    else:
        # Default: today in JST, clamped to today.
        end_month, end_day = today_jst.month, today_jst.day

    # Build date objects for current year and last year.
    current_start = datetime.date(current_year, start_month, start_day)
    current_end = datetime.date(current_year, end_month, end_day)
    # Clamp current end to today so we don't query future dates.
    if current_end > today_jst:
        current_end = today_jst

    last_year = current_year - 1
    last_start = datetime.date(last_year, start_month, start_day)
    last_end = datetime.date(last_year, end_month, end_day)

    # Fetch both periods concurrently.
    current_raw, last_raw = await asyncio.gather(
        fetch_player_period_stats(player_id, current_start, current_end, current_year),
        fetch_player_period_stats(player_id, last_start, last_end, last_year),
    )

    def _build_period_stats(
        raw: dict[str, Any],
        season: int,
        period_start: datetime.date,
        period_end: datetime.date,
    ) -> PeriodStats:
        """Coerce raw MLB API stat dict into a PeriodStats schema."""
        avg_val = raw.get("avg")
        ops_val = raw.get("ops")
        hr_val = raw.get("homeRuns")
        rbi_val = raw.get("rbi")
        hits_val = raw.get("hits")
        pa_val = raw.get("plateAppearances")

        return PeriodStats(
            season=season,
            start_date=period_start.isoformat(),
            end_date=period_end.isoformat(),
            avg=float(avg_val) if avg_val is not None else None,
            ops=float(ops_val) if ops_val is not None else None,
            home_runs=int(hr_val) if hr_val is not None else None,
            rbi=int(rbi_val) if rbi_val is not None else None,
            hits=int(hits_val) if hits_val is not None else None,
            plate_appearances=int(pa_val) if pa_val is not None else None,
        )

    return PeriodComparisonResponse(
        player_id=player_id,
        current=_build_period_stats(current_raw, current_year, current_start, current_end),
        last_year=_build_period_stats(last_raw, last_year, last_start, last_end),
    )


# ---------------------------------------------------------------------------
# GET /api/players/{id}/recent-form
# ---------------------------------------------------------------------------


@router.get("/{player_id}/recent-form", response_model=RecentFormResponse)
@limiter.limit("60/minute")
async def get_recent_form(
    request: Request,
    player_id: str,
    supabase: Client = Depends(get_supabase),
) -> RecentFormResponse:
    """Return batting stats for the last 7, 14, and 30 days.

    Public endpoint — no Pro gate required.
    Uses the MLB Stats API byDateRange stat type for each window.
    """
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

    windows_raw: dict[str, dict] = await fetch_player_recent_form(player_id, current_season)

    _window_days: dict[str, int] = {"7d": 7, "14d": 14, "30d": 30}
    windows: list[RecentFormWindow] = []
    for key, days in _window_days.items():
        raw: dict = windows_raw.get(key, {})
        avg_val = raw.get("avg")
        ops_val = raw.get("ops")
        hr_val = raw.get("homeRuns")
        rbi_val = raw.get("rbi")
        hits_val = raw.get("hits")
        pa_val = raw.get("plateAppearances")
        windows.append(
            RecentFormWindow(
                days=days,
                avg=float(avg_val) if avg_val is not None else None,
                ops=float(ops_val) if ops_val is not None else None,
                home_runs=int(hr_val) if hr_val is not None else None,
                rbi=int(rbi_val) if rbi_val is not None else None,
                hits=int(hits_val) if hits_val is not None else None,
                plate_appearances=int(pa_val) if pa_val is not None else None,
            )
        )

    return RecentFormResponse(player_id=player_id, windows=windows)


# ---------------------------------------------------------------------------
# GET /api/players/{id}/game-logs
# ---------------------------------------------------------------------------


@router.get("/{player_id}/game-logs", response_model=GameLogResponse)
@limiter.limit("30/minute")
async def get_game_logs(
    request: Request,
    player_id: str,
    season: int | None = None,
    supabase: Client = Depends(get_supabase),
) -> GameLogResponse:
    """Return per-game hitting stats for a player for the given season.

    Public endpoint — no Pro gate needed (basic stats).
    Query params:
        season (int, optional): MLB season year. Defaults to current JST year.
    """
    from datetime import datetime

    import pytz

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

    entries_raw: list[dict[str, Any]] = await fetch_player_game_log(player_id, season)

    entries: list[GameLogEntry] = [
        GameLogEntry(
            date=e["date"],
            opponent=e["opponent"],
            game_pk=e["game_pk"],
            at_bats=e.get("at_bats"),
            hits=e.get("hits"),
            home_runs=e.get("home_runs"),
            rbi=e.get("rbi"),
            avg=e.get("avg"),
        )
        for e in entries_raw
    ]

    return GameLogResponse(player_id=player_id, season=season, entries=entries)


# ---------------------------------------------------------------------------
# GET /api/players/{id}/career
# ---------------------------------------------------------------------------


@router.get("/{player_id}/career", response_model=CareerResponse)
@limiter.limit("30/minute")
async def get_career(
    request: Request,
    player_id: str,
    supabase: Client = Depends(get_supabase),
) -> CareerResponse:
    """Return year-by-year career stats for a player (batting and/or pitching).

    Public endpoint — no Pro gate required.
    Fetches from the MLB Stats API yearByYear stat type for both groups.
    """
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

    seasons_raw: list[dict] = await fetch_player_career(player_id)

    seasons: list[CareerSeasonStat] = [
        CareerSeasonStat(
            season=s["season"],
            stat_type=s["stat_type"],
            avg=s.get("avg"),
            ops=s.get("ops"),
            home_runs=s.get("home_runs"),
            rbi=s.get("rbi"),
            era=s.get("era"),
            wins=s.get("wins"),
            strikeouts=s.get("strikeouts"),
            whip=s.get("whip"),
            games=s.get("games"),
        )
        for s in seasons_raw
    ]

    return CareerResponse(player_id=player_id, seasons=seasons)
