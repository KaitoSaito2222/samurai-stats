"""
Samurai Stats — FastAPI application entry point.

Registers all routers, middleware (CORS, rate limiting), and the health check endpoint.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from routers import ai, games, internal, players, users

# ---------------------------------------------------------------------------
# Global rate limiter (slowapi).
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Application factory.
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Samurai Stats API",
    description="Bilingual MLB stats platform focused on Japanese players.",
    version="1.0.0",
)

# Attach the rate-limiter to the app state so slowapi can inject it.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS middleware.
# ---------------------------------------------------------------------------

_raw_origins: str = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins: list[str] = (
    [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]
    if _raw_origins
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers.
# ---------------------------------------------------------------------------

app.include_router(players.router)
app.include_router(games.router)
app.include_router(ai.router)
app.include_router(users.router)
app.include_router(internal.router)

# ---------------------------------------------------------------------------
# Health check.
# ---------------------------------------------------------------------------


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    """Simple liveness probe used by Railway and load balancers."""
    return {"status": "ok"}
