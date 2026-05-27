"""
Pydantic schemas for game-related API responses.
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel


class GameListItem(BaseModel):
    id: str
    home_team_ja: str
    home_team_en: str
    away_team_ja: str
    away_team_en: str
    home_score: int | None
    away_score: int | None
    inning: int | None
    game_date: datetime.date
    status: str
    venue: str | None


class GameDetail(GameListItem):
    pass
