"""
FastAPI dependencies for user plan checks.
"""

from fastapi import HTTPException
from gotrue.types import User
from supabase import Client


def require_pro(user: User, supabase: Client) -> None:
    """Raise 403 if the user is not on the Pro plan.

    Raises:
        HTTPException 403: with code PRO_REQUIRED.
    """
    row = (
        supabase.table("users")
        .select("plan")
        .eq("id", str(user.id))
        .single()
        .execute()
    )
    if not row.data or row.data.get("plan") != "pro":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PRO_REQUIRED",
                "message": "This feature requires a Pro plan.",
            },
        )


def get_user_plan(user: User, supabase: Client) -> str:
    """Return the user's plan string ('free' or 'pro').

    Returns 'free' if the row does not exist or plan is absent.
    """
    row = (
        supabase.table("users")
        .select("plan")
        .eq("id", str(user.id))
        .single()
        .execute()
    )
    return row.data.get("plan", "free") if row.data else "free"
