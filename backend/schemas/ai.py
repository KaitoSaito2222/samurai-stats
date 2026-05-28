"""
Pydantic schemas for AI-related API requests and responses.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class SummaryRequest(BaseModel):
    lang: Literal["ja", "en"] = "ja"


class SummaryResponse(BaseModel):
    summary: str
    calls_used: int
    calls_limit: int  # 3 for free users, -1 for pro users (no hard limit)


class AnalysisRequest(BaseModel):
    lang: Literal["ja", "en"] = "ja"


class AnalysisResponse(BaseModel):
    analysis: str
    calls_used: int
    calls_limit: int  # 3 for free, -1 for pro


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    player_id: str
    message: str
    history: list[ChatMessage] = []
