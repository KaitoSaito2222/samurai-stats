"""
AI endpoints.

Phase 1: POST /api/ai/summary/{player_id}
Phase 2: POST /api/ai/analysis/{player_id}  (Free/Pro via Gemini)
         POST /api/ai/chat                   (Pro only, Claude SSE streaming)

Free users: hard limit of 3 calls/day (JST), tracked in ai_usage table.
Pro users:  no hard limit; soft warning header X-AI-Remaining when < 10 remain.
Unauthenticated users: treated as free with 1 call/day per IP.
"""

import datetime
import json
import time
from collections.abc import AsyncGenerator
from typing import Any

import pytz
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from gotrue.types import User
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from database import get_supabase
from dependencies.auth import get_current_user, get_optional_user
from dependencies.plan import get_user_plan
from schemas.ai import AnalysisRequest, AnalysisResponse, ChatRequest, SummaryRequest, SummaryResponse
from services.claude import MAX_HISTORY_TURNS
from services.gemini import generate_player_analysis, generate_player_summary

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/ai", tags=["ai"])

JST = pytz.timezone("Asia/Tokyo")

FREE_DAILY_LIMIT = 3
PRO_SOFT_LIMIT = 100
PRO_SOFT_LIMIT_WARNING_THRESHOLD = 10
ANON_DAILY_LIMIT = 1


def usage_date_jst() -> datetime.date:
    """Return the current calendar date in JST for usage tracking."""
    return datetime.datetime.now(JST).date()


def today_jst_utc_start() -> datetime.datetime:
    """Return UTC datetime of JST midnight (start of today in JST).

    Used to query ai_logs for Pro daily usage. Using a real UTC boundary
    avoids mismatches when comparing against created_at timestamps.
    """
    today = datetime.datetime.now(JST).date()
    jst_midnight = JST.localize(datetime.datetime.combine(today, datetime.time.min))
    return jst_midnight.astimezone(pytz.utc)


def _get_or_create_usage_row(
    supabase: Client, user_id: str, date: datetime.date
) -> dict[str, Any]:
    """Return the ai_usage row for (user_id, date), creating it if absent."""
    date_str: str = date.isoformat()
    existing = (
        supabase.table("ai_usage")
        .select("*")
        .eq("user_id", user_id)
        .eq("usage_date", date_str)
        .single()
        .execute()
    )
    if existing.data:
        return existing.data

    # Row does not exist — create it.
    supabase.table("ai_usage").insert(
        {"user_id": user_id, "usage_date": date_str, "ai_call_count": 0}
    ).execute()
    return {"user_id": user_id, "usage_date": date_str, "ai_call_count": 0}


def _increment_usage(
    supabase: Client, user_id: str, date: datetime.date
) -> int:
    """Increment ai_call_count and return the new value."""
    date_str: str = date.isoformat()
    # Fetch the current count, then update.
    row = _get_or_create_usage_row(supabase, user_id, date)
    new_count: int = row["ai_call_count"] + 1
    supabase.table("ai_usage").update({"ai_call_count": new_count}).eq(
        "user_id", user_id
    ).eq("usage_date", date_str).execute()
    return new_count


def _log_ai_call(
    supabase: Client,
    user_id: str,
    feature: str,
    model: str,
    latency_ms: int,
) -> None:
    """Insert a row into ai_logs for cost monitoring."""
    supabase.table("ai_logs").insert(
        {
            "user_id": user_id,
            "feature": feature,
            "model": model,
            "latency_ms": latency_ms,
        }
    ).execute()


def _count_pro_calls_today(supabase: Client, user_id: str) -> int:
    """Count ai_logs rows for the user since JST midnight (UTC-aware)."""
    utc_start: str = today_jst_utc_start().strftime("%Y-%m-%dT%H:%M:%SZ")
    result = (
        supabase.table("ai_logs")
        .select("id", count="exact")  # type: ignore[arg-type]
        .eq("user_id", user_id)
        .gte("created_at", utc_start)
        .execute()
    )
    return result.count or 0


# ---------------------------------------------------------------------------
# POST /api/ai/summary/{player_id}
# ---------------------------------------------------------------------------


@router.post("/summary/{player_id}", response_model=SummaryResponse)
@limiter.limit("60/minute")
async def get_player_summary(
    request: Request,
    player_id: str,
    body: SummaryRequest,
    response: Response,
    user: User | None = Depends(get_optional_user),
    supabase: Client = Depends(get_supabase),
) -> SummaryResponse:
    """Generate an AI quick summary for a player using Gemini (gemini-2.0-flash).

    Access rules:
    - Unauthenticated: 1 call/day per IP (simple Phase 1 approach).
    - Free users: 3 calls/day (shared with analysis). Hard block at limit.
    - Pro users: no hard limit; X-AI-Remaining header when < 10 remain today.
    """
    today: datetime.date = usage_date_jst()

    # ------------------------------------------------------------------
    # Fetch the player record from the DB.
    # ------------------------------------------------------------------
    player_response = (
        supabase.table("players")
        .select("*")
        .eq("id", player_id)
        .single()
        .execute()
    )
    if not player_response.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )

    player_row: dict = player_response.data
    names: dict = player_row.get("names") or {}
    team: dict = player_row.get("team") or {}

    player_dict: dict = {
        "id": player_row["id"],
        "name_en": names.get("en", ""),
        "name_ja": names.get("ja", ""),
        "team": team.get("en", ""),
        "position": player_row.get("position") or "",
    }

    # ------------------------------------------------------------------
    # Fetch current season stats from the DB (already synced).
    # ------------------------------------------------------------------
    import datetime as dt

    current_season: int = dt.datetime.now(JST).year
    stats_response = (
        supabase.table("player_stats")
        .select("*")
        .eq("player_id", player_id)
        .eq("season", current_season)
        .execute()
    )
    stats_rows: list[dict] = stats_response.data or []
    batting_row: dict = {}
    pitching_row: dict = {}
    for row in stats_rows:
        if row.get("stat_type") == "batting":
            batting_row = row
        elif row.get("stat_type") == "pitching":
            pitching_row = row

    stats_dict: dict = {
        "batting": batting_row or None,
        "pitching": pitching_row or None,
    }

    # ------------------------------------------------------------------
    # Rate limiting logic
    # ------------------------------------------------------------------

    if user is None:
        # Unauthenticated: 1 call/day per IP using a synthetic user_id.
        ip_key: str = f"anon:{get_remote_address(request)}"
        usage_row = _get_or_create_usage_row(supabase, ip_key, today)
        calls_used_before: int = usage_row["ai_call_count"]

        if calls_used_before >= ANON_DAILY_LIMIT:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "LIMIT_EXCEEDED",
                    "message": (
                        "Daily AI limit reached. Sign in for more summaries."
                    ),
                },
            )

        start_ms: int = int(time.time() * 1000)
        summary: str = await generate_player_summary(player_dict, stats_dict, body.lang)
        latency_ms: int = int(time.time() * 1000) - start_ms

        new_count: int = _increment_usage(supabase, ip_key, today)

        return SummaryResponse(
            summary=summary,
            calls_used=new_count,
            calls_limit=ANON_DAILY_LIMIT,
        )

    # ------------------------------------------------------------------
    # Authenticated user: determine plan.
    # ------------------------------------------------------------------
    plan: str = get_user_plan(user, supabase)
    user_id: str = str(user.id)

    if plan == "pro":
        # Pro: no hard limit — just generate and log.
        calls_today: int = _count_pro_calls_today(supabase, user_id)

        start_ms = int(time.time() * 1000)
        summary = await generate_player_summary(player_dict, stats_dict, body.lang)
        latency_ms = int(time.time() * 1000) - start_ms

        _log_ai_call(supabase, user_id, "summary", "gemini-2.0-flash", latency_ms)

        # Recount after insert for accurate remaining calculation.
        calls_today_after: int = calls_today + 1
        remaining: int = PRO_SOFT_LIMIT - calls_today_after
        if remaining < PRO_SOFT_LIMIT_WARNING_THRESHOLD:
            response.headers["X-AI-Remaining"] = str(max(remaining, 0))

        return SummaryResponse(
            summary=summary,
            calls_used=calls_today_after,
            calls_limit=-1,
        )

    # ------------------------------------------------------------------
    # Free user: hard limit of 3/day.
    # ------------------------------------------------------------------
    usage_row = _get_or_create_usage_row(supabase, user_id, today)
    calls_used_before = usage_row["ai_call_count"]

    if calls_used_before >= FREE_DAILY_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": (
                    f"Daily AI limit of {FREE_DAILY_LIMIT} calls reached. "
                    "Upgrade to Pro for more."
                ),
            },
        )

    start_ms = int(time.time() * 1000)
    summary = await generate_player_summary(player_dict, stats_dict, body.lang)
    latency_ms = int(time.time() * 1000) - start_ms

    new_count = _increment_usage(supabase, user_id, today)
    _log_ai_call(supabase, user_id, "summary", "gemini-2.0-flash", latency_ms)

    return SummaryResponse(
        summary=summary,
        calls_used=new_count,
        calls_limit=FREE_DAILY_LIMIT,
    )


# ---------------------------------------------------------------------------
# POST /api/ai/analysis/{player_id}
# ---------------------------------------------------------------------------


@router.post("/analysis/{player_id}", response_model=AnalysisResponse)
@limiter.limit("60/minute")
async def get_player_analysis(
    request: Request,
    player_id: str,
    body: AnalysisRequest,
    response: Response,
    user: User | None = Depends(get_optional_user),
    supabase: Client = Depends(get_supabase),
) -> AnalysisResponse:
    """Generate an AI detailed analysis for a player using Gemini (gemini-2.0-flash).

    Access rules:
    - Unauthenticated: 1 call/day per IP (shared with summary).
    - Free users: 3 calls/day (shared with summary). Hard block at limit.
    - Pro users: no hard limit; X-AI-Remaining header when < 10 remain today.
    """
    today: datetime.date = usage_date_jst()

    # Fetch the player record from the DB.
    player_response = (
        supabase.table("players")
        .select("*")
        .eq("id", player_id)
        .single()
        .execute()
    )
    if not player_response.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )

    player_row: dict = player_response.data
    names: dict = player_row.get("names") or {}
    team: dict = player_row.get("team") or {}

    player_dict: dict = {
        "id": player_row["id"],
        "name_en": names.get("en", ""),
        "name_ja": names.get("ja", ""),
        "team": team.get("en", ""),
        "position": player_row.get("position") or "",
    }

    # Fetch current season stats from the DB.
    import datetime as dt

    current_season: int = dt.datetime.now(JST).year
    stats_response = (
        supabase.table("player_stats")
        .select("*")
        .eq("player_id", player_id)
        .eq("season", current_season)
        .execute()
    )
    stats_rows: list[dict] = stats_response.data or []
    batting_row: dict = next(
        (r for r in stats_rows if r.get("stat_type") == "batting"), {}
    )
    pitching_row: dict = next(
        (r for r in stats_rows if r.get("stat_type") == "pitching"), {}
    )

    # Build trends dict. Same-period-last-year and monthly data pending Phase 2 byDateRange.
    trends: dict = {
        "current_period": {"batting": batting_row, "pitching": pitching_row},
        "same_period_last_year": {},
        "by_month": [],
    }

    # Rate limiting logic (mirrors summary endpoint — same shared limit).
    if user is None:
        # Unauthenticated: 1 call/day per IP.
        ip_key: str = f"anon:{get_remote_address(request)}"
        usage_row = _get_or_create_usage_row(supabase, ip_key, today)
        calls_used_before: int = usage_row["ai_call_count"]

        if calls_used_before >= ANON_DAILY_LIMIT:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "LIMIT_EXCEEDED",
                    "message": "Daily AI limit reached. Sign in for more analysis.",
                },
            )

        start_ms: int = int(time.time() * 1000)
        analysis: str = await generate_player_analysis(player_dict, trends, body.lang)
        latency_ms: int = int(time.time() * 1000) - start_ms  # noqa: F841 — reserved for future logging

        new_count: int = _increment_usage(supabase, ip_key, today)

        return AnalysisResponse(
            analysis=analysis,
            calls_used=new_count,
            calls_limit=ANON_DAILY_LIMIT,
        )

    # Authenticated user: determine plan.
    plan: str = get_user_plan(user, supabase)
    user_id: str = str(user.id)

    if plan == "pro":
        # Pro: no hard limit — just generate and log.
        calls_today: int = _count_pro_calls_today(supabase, user_id)

        start_ms = int(time.time() * 1000)
        analysis = await generate_player_analysis(player_dict, trends, body.lang)
        latency_ms = int(time.time() * 1000) - start_ms

        _log_ai_call(supabase, user_id, "analysis", "gemini-2.0-flash", latency_ms)

        calls_today_after: int = calls_today + 1
        remaining: int = PRO_SOFT_LIMIT - calls_today_after
        if remaining < PRO_SOFT_LIMIT_WARNING_THRESHOLD:
            response.headers["X-AI-Remaining"] = str(max(remaining, 0))

        return AnalysisResponse(
            analysis=analysis,
            calls_used=calls_today_after,
            calls_limit=-1,
        )

    # Free user: hard limit of 3/day (shared with summary).
    usage_row = _get_or_create_usage_row(supabase, user_id, today)
    calls_used_before = usage_row["ai_call_count"]

    if calls_used_before >= FREE_DAILY_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": (
                    f"Daily AI limit of {FREE_DAILY_LIMIT} calls reached. "
                    "Upgrade to Pro for more."
                ),
            },
        )

    start_ms = int(time.time() * 1000)
    analysis = await generate_player_analysis(player_dict, trends, body.lang)
    latency_ms = int(time.time() * 1000) - start_ms

    new_count = _increment_usage(supabase, user_id, today)
    _log_ai_call(supabase, user_id, "analysis", "gemini-2.0-flash", latency_ms)

    return AnalysisResponse(
        analysis=analysis,
        calls_used=new_count,
        calls_limit=FREE_DAILY_LIMIT,
    )


# ---------------------------------------------------------------------------
# POST /api/ai/chat  (Pro only, SSE streaming via Claude)
# ---------------------------------------------------------------------------


@router.post("/chat")
@limiter.limit("30/minute")
async def post_ai_chat(
    request: Request,
    body: ChatRequest,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> StreamingResponse:
    """Stream Claude response tokens for Pro player chat via SSE.

    Pro only. Requires authentication. Rejects history exceeding MAX_HISTORY_TURNS.
    """
    plan: str = get_user_plan(user, supabase)
    if plan != "pro":
        raise HTTPException(
            status_code=403,
            detail={"code": "PRO_REQUIRED", "message": "AI chat requires Pro plan."},
        )

    if len(body.history) > MAX_HISTORY_TURNS:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_REQUEST",
                "message": f"History exceeds {MAX_HISTORY_TURNS} turns.",
            },
        )

    # Fetch player from DB.
    player_response = (
        supabase.table("players")
        .select("*")
        .eq("id", body.player_id)
        .single()
        .execute()
    )
    if not player_response.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )
    player_row: dict = player_response.data
    names: dict = player_row.get("names") or {}
    team: dict = player_row.get("team") or {}
    player_dict: dict = {
        "id": player_row["id"],
        "name_en": names.get("en", ""),
        "name_ja": names.get("ja", ""),
        "team": team.get("en", ""),
        "position": player_row.get("position") or "",
    }

    # Fetch current season stats for context.
    import datetime as dt

    current_season: int = dt.datetime.now(JST).year
    stats_response = (
        supabase.table("player_stats")
        .select("*")
        .eq("player_id", body.player_id)
        .eq("season", current_season)
        .execute()
    )
    stats_rows: list[dict] = stats_response.data or []
    batting_row: dict = next(
        (r for r in stats_rows if r.get("stat_type") == "batting"), {}
    )
    pitching_row: dict = next(
        (r for r in stats_rows if r.get("stat_type") == "pitching"), {}
    )

    recent_stats: dict = {
        "batting_season": batting_row,
        "pitching_season": pitching_row,
        "batting_last_30": {},
        "pitching_last_30": {},
    }
    game_context: dict = {
        "opponent": "Unknown",
        "venue": "Unknown",
        "game_date": "Unknown",
    }

    history_dicts: list[dict] = [
        {"role": m.role, "content": m.content} for m in body.history
    ]

    # Log the chat call before streaming (latency tracked as 0 — streaming).
    user_id: str = str(user.id)
    _log_ai_call(supabase, user_id, "chat", "claude-sonnet-4-6", 0)

    async def sse_generator() -> AsyncGenerator[str, None]:
        from services.claude import stream_player_chat

        try:
            async for text in stream_player_chat(
                player=player_dict,
                recent_stats=recent_stats,
                game_context=game_context,
                history=history_dicts,
                message=body.message,
            ):
                yield f"data: {json.dumps({'text': text})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'AI chat temporarily unavailable.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
