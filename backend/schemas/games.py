"""
Pydantic schemas for game-related API responses.
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel


class GamePlayer(BaseModel):
    id: str
    name_ja: str
    name_en: str
    photo_url: str | None


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
    game_time: datetime.datetime | None = None
    status: str
    venue: str | None
    japanese_players: list[GamePlayer] = []


class GameDetail(GameListItem):
    pass


class BoxscoreBatter(BaseModel):
    player_id: str
    name_en: str
    name_ja: str
    is_analyzable: bool
    position: str
    batting_order: int | None
    at_bats: int
    runs: int
    hits: int
    doubles: int
    home_runs: int
    rbi: int
    walks: int
    strikeouts: int
    avg: float | None  # season batting average as of this game


class BoxscorePitcher(BaseModel):
    player_id: str
    name_en: str
    name_ja: str
    is_analyzable: bool
    innings_pitched: str  # kept as string ("6.0", "0.1") to avoid float precision issues
    hits: int
    runs: int
    earned_runs: int
    walks: int
    strikeouts: int
    home_runs: int
    era: float | None  # season ERA as of this game


class TeamBoxscore(BaseModel):
    team_en: str
    team_ja: str
    batters: list[BoxscoreBatter] = []
    pitchers: list[BoxscorePitcher] = []


class GameBoxscore(BaseModel):
    home: TeamBoxscore | None = None
    away: TeamBoxscore | None = None
