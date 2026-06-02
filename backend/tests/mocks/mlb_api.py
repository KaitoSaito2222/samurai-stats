"""
Mock helpers returning sample MLB API response dicts.

These are plain Python dicts — no real HTTP calls are made.
Import these fixtures in unit tests to avoid hitting the MLB Stats API.
"""

from typing import Any


def make_schedule_response(games: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Return a minimal /schedule API response."""
    default_games = games if games is not None else [
        {
            "gamePk": 123456,
            "gameDate": "2026-05-28T18:10:00Z",
            "status": {
                "abstractGameState": "Final",
                "detailedState": "Final",
            },
            "teams": {
                "home": {"team": {"id": 147, "name": "New York Yankees"}},
                "away": {"team": {"id": 119, "name": "Los Angeles Dodgers"}},
            },
            "venue": {"id": 3313, "name": "Yankee Stadium"},
        }
    ]
    return {
        "dates": [
            {
                "date": "2026-05-28",
                "games": default_games,
            }
        ]
    }


def make_player_roster_response(player_ids: list[int] | None = None) -> dict[str, Any]:
    """Return a minimal /teams/{id}/roster response."""
    ids = player_ids if player_ids is not None else [660271, 592450]
    return {
        "roster": [
            {
                "person": {"id": pid, "fullName": f"Player {pid}"},
                "status": {"code": "A", "description": "Active"},
                "jerseyNumber": str(i + 1),
            }
            for i, pid in enumerate(ids)
        ]
    }


def make_sports_players_response(players: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Return a minimal /sports/1/players response containing mixed birthCountry values."""
    default_players = players if players is not None else [
        {
            "id": 660271,
            "fullName": "Shohei Ohtani",
            "birthCountry": "Japan",
            "currentTeam": {"id": 119, "name": "Los Angeles Dodgers"},
            "primaryPosition": {"abbreviation": "DH", "name": "Designated Hitter"},
            "active": True,
        },
        {
            "id": 545361,
            "fullName": "Mike Trout",
            "birthCountry": "USA",
            "currentTeam": {"id": 108, "name": "Los Angeles Angels"},
            "primaryPosition": {"abbreviation": "CF", "name": "Center Field"},
            "active": True,
        },
        {
            "id": 592450,
            "fullName": "Yoshida Masataka",
            "birthCountry": "Japan",
            "currentTeam": {"id": 111, "name": "Boston Red Sox"},
            "primaryPosition": {"abbreviation": "LF", "name": "Left Field"},
            "active": True,
        },
    ]
    return {"people": default_players}


def make_player_stats_response(
    group: str = "hitting",
    avg: str = ".300",
    ops: str = ".900",
    home_runs: int = 20,
) -> dict[str, Any]:
    """Return a minimal /people/{id}/stats response for one stat group."""
    if group == "hitting":
        stat: dict[str, Any] = {
            "avg": avg,
            "ops": ops,
            "homeRuns": home_runs,
            "rbi": 60,
            "hits": 90,
            "gamesPlayed": 100,
            "plateAppearances": 350,
        }
    else:
        stat = {
            "era": "2.50",
            "wins": 10,
            "strikeouts": 150,
            "whip": "1.05",
            "inningsPitched": "120.0",
            "gamesPlayed": 20,
        }
    return {
        "stats": [
            {
                "type": {"displayName": "season"},
                "group": {"displayName": group},
                "splits": [{"stat": stat}],
            }
        ]
    }
