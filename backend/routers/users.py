"""
User endpoints: plan info and favorites management.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from gotrue.types import User
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from backend.database import get_supabase
from backend.dependencies.auth import get_current_user
from backend.schemas.players import PlayerListItem
from backend.schemas.users import UserPlan

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/user", tags=["users"])


# ---------------------------------------------------------------------------
# GET /api/user/plan
# ---------------------------------------------------------------------------


@router.get("/plan", response_model=UserPlan)
@limiter.limit("60/minute")
async def get_plan(
    request: Request,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> UserPlan:
    """Return the authenticated user's plan and Stripe customer ID."""
    row = (
        supabase.table("users")
        .select("plan, stripe_customer_id")
        .eq("id", str(user.id))
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "User profile not found."},
        )
    return UserPlan(
        plan=row.data.get("plan", "free"),
        stripe_customer_id=row.data.get("stripe_customer_id"),
    )


# ---------------------------------------------------------------------------
# GET /api/user/favorites
# ---------------------------------------------------------------------------


@router.get("/favorites", response_model=list[PlayerListItem])
@limiter.limit("60/minute")
async def get_favorites(
    request: Request,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> list[PlayerListItem]:
    """Return the authenticated user's favorited players."""
    # Fetch favorite player IDs.
    fav_response = (
        supabase.table("user_favorites")
        .select("player_id")
        .eq("user_id", str(user.id))
        .execute()
    )
    player_ids: list[str] = [
        row["player_id"] for row in (fav_response.data or [])
    ]

    if not player_ids:
        return []

    # Fetch player rows.
    players_response = (
        supabase.table("players")
        .select("*")
        .in_("id", player_ids)
        .execute()
    )
    rows: list[dict] = players_response.data or []

    result: list[PlayerListItem] = []
    for row in rows:
        names: dict = row.get("names") or {}
        team: dict = row.get("team") or {}
        result.append(
            PlayerListItem(
                id=row["id"],
                name_ja=names.get("ja", ""),
                name_en=names.get("en", ""),
                team_ja=team.get("ja", ""),
                team_en=team.get("en", ""),
                position=row.get("position") or "",
                photo_url=row.get("photo_url"),
                is_japanese=row.get("is_japanese", False),
            )
        )
    return result


# ---------------------------------------------------------------------------
# POST /api/user/favorites/{player_id}
# ---------------------------------------------------------------------------


@router.post("/favorites/{player_id}", status_code=200)
@limiter.limit("60/minute")
async def add_favorite(
    request: Request,
    player_id: str,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict[str, str]:
    """Add a player to the authenticated user's favorites."""
    # Verify the player exists.
    player_check = (
        supabase.table("players").select("id").eq("id", player_id).single().execute()
    )
    if not player_check.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Player not found."},
        )

    # Upsert to handle duplicate gracefully.
    supabase.table("user_favorites").upsert(
        {"user_id": str(user.id), "player_id": player_id},
        on_conflict="user_id,player_id",
    ).execute()

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# DELETE /api/user/favorites/{player_id}
# ---------------------------------------------------------------------------


@router.delete("/favorites/{player_id}", status_code=200)
@limiter.limit("60/minute")
async def remove_favorite(
    request: Request,
    player_id: str,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict[str, str]:
    """Remove a player from the authenticated user's favorites."""
    supabase.table("user_favorites").delete().eq("user_id", str(user.id)).eq(
        "player_id", player_id
    ).execute()
    return {"status": "ok"}
