"""
FastAPI dependencies for Supabase JWT authentication.
"""

from fastapi import Depends, Header, HTTPException
from gotrue.types import User
from supabase import Client

from database import get_supabase


def get_current_user(
    authorization: str = Header(...),
    supabase: Client = Depends(get_supabase),
) -> User:
    """Validate Bearer JWT and return the authenticated Supabase user.

    Raises:
        HTTPException 401: if the token is missing, malformed, or expired.
    """
    token: str = authorization.removeprefix("Bearer ")
    try:
        response = supabase.auth.get_user(token)
        return response.user
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid or expired token."},
        )


def get_optional_user(
    authorization: str | None = Header(default=None),
    supabase: Client = Depends(get_supabase),
) -> User | None:
    """Return the authenticated user, or None if no Authorization header is provided.

    Used on public endpoints that behave differently when authenticated.
    """
    if not authorization:
        return None
    return get_current_user(authorization, supabase)
