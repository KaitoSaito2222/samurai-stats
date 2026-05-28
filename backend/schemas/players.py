"""
Pydantic schemas for player-related API responses.
"""

from __future__ import annotations

from pydantic import BaseModel


class PlayerListItem(BaseModel):
    id: str
    name_ja: str
    name_en: str
    team_ja: str
    team_en: str
    position: str
    photo_url: str | None
    is_japanese: bool


class PlayerDetail(PlayerListItem):
    active: bool


class BattingStats(BaseModel):
    avg: float | None
    home_runs: int | None
    rbi: int | None
    ops: float | None
    hits: int | None
    games: int | None
    season: int


class PitchingStats(BaseModel):
    era: float | None
    wins: int | None
    strikeouts: int | None
    whip: float | None
    innings_pitched: float | None
    games: int | None
    season: int


class PlayerStats(BaseModel):
    player_id: str
    batting: BattingStats | None
    pitching: PitchingStats | None


class PaginatedPlayers(BaseModel):
    items: list[PlayerListItem]
    total: int
    page: int
    limit: int
    has_next: bool


class PeriodStats(BaseModel):
    season: int
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    avg: float | None
    ops: float | None
    home_runs: int | None
    rbi: int | None
    hits: int | None
    plate_appearances: int | None


class PeriodComparisonResponse(BaseModel):
    player_id: str
    current: PeriodStats
    last_year: PeriodStats
