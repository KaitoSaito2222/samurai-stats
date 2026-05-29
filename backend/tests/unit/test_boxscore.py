"""
Unit tests for fetch_boxscore_batting in services/mlb_api.py.

No real HTTP calls are made — httpx is mocked.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_boxscore_response(
    home_players: dict | None = None,
    away_players: dict | None = None,
) -> dict:
    """Build a minimal /game/{gamePk}/boxscore response dict."""
    default_home = {
        "ID660271": {
            "person": {"id": 660271},
            "stats": {
                "batting": {
                    "atBats": 4,
                    "hits": 2,
                    "homeRuns": 1,
                    "rbi": 3,
                }
            },
        },
        "ID999999": {
            "person": {"id": 999999},
            "stats": {
                "batting": {
                    "atBats": 3,
                    "hits": 0,
                    "homeRuns": 0,
                    "rbi": 0,
                }
            },
        },
    }
    default_away = {
        "ID592450": {
            "person": {"id": 592450},
            "stats": {
                "batting": {
                    "atBats": 3,
                    "hits": 1,
                    "homeRuns": 0,
                    "rbi": 1,
                }
            },
        },
    }
    return {
        "teams": {
            "home": {"players": home_players if home_players is not None else default_home},
            "away": {"players": away_players if away_players is not None else default_away},
        }
    }


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_returns_all_batters() -> None:
    """Returns entries for all players with atBats > 0 from both teams."""
    from services.mlb_api import fetch_boxscore_batting

    mock_resp = MagicMock()
    mock_resp.json.return_value = _make_boxscore_response()
    mock_resp.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_resp)
        result = await fetch_boxscore_batting("717948")

    assert len(result) == 3
    player_ids = {r["player_id"] for r in result}
    assert player_ids == {"660271", "999999", "592450"}


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_field_mapping() -> None:
    """Returned dicts have correct keys and values mapped from API response."""
    from services.mlb_api import fetch_boxscore_batting

    mock_resp = MagicMock()
    mock_resp.json.return_value = _make_boxscore_response()
    mock_resp.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_resp)
        result = await fetch_boxscore_batting("717948")

    ohtani = next(r for r in result if r["player_id"] == "660271")
    assert ohtani["at_bats"] == 4
    assert ohtani["hits"] == 2
    assert ohtani["home_runs"] == 1
    assert ohtani["rbi"] == 3


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_skips_zero_ab() -> None:
    """Players with atBats == 0 (pinch runner, DNP) are excluded."""
    from services.mlb_api import fetch_boxscore_batting

    home_players = {
        "ID660271": {
            "person": {"id": 660271},
            "stats": {
                "batting": {"atBats": 4, "hits": 1, "homeRuns": 0, "rbi": 0}
            },
        },
        "ID111111": {
            "person": {"id": 111111},
            "stats": {
                "batting": {"atBats": 0, "hits": 0, "homeRuns": 0, "rbi": 0}
            },
        },
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = _make_boxscore_response(
        home_players=home_players, away_players={}
    )
    mock_resp.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_resp)
        result = await fetch_boxscore_batting("717948")

    assert len(result) == 1
    assert result[0]["player_id"] == "660271"


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_skips_no_batting_stats() -> None:
    """Players without a batting stats block (pitchers) are excluded."""
    from services.mlb_api import fetch_boxscore_batting

    home_players = {
        "ID660271": {
            "person": {"id": 660271},
            "stats": {
                "batting": {"atBats": 3, "hits": 1, "homeRuns": 0, "rbi": 0}
            },
        },
        "ID222222": {
            "person": {"id": 222222},
            "stats": {
                "pitching": {"inningsPitched": "6.0", "strikeouts": 7}
            },
        },
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = _make_boxscore_response(
        home_players=home_players, away_players={}
    )
    mock_resp.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_resp)
        result = await fetch_boxscore_batting("717948")

    assert len(result) == 1
    assert result[0]["player_id"] == "660271"


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_returns_empty_on_http_error() -> None:
    """Returns [] when the HTTP call fails."""
    import httpx

    from services.mlb_api import fetch_boxscore_batting

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("timeout"))
        result = await fetch_boxscore_batting("717948")

    assert result == []
