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
async def test_fetch_boxscore_batting_skips_null_person_id() -> None:
    """A player whose person.id is null is skipped (no 'None' player_id written)."""
    from services.mlb_api import fetch_boxscore_batting

    home_players = {
        "IDnull": {
            "person": {"id": None},
            "stats": {"batting": {"atBats": 4, "hits": 2, "homeRuns": 0, "rbi": 1}},
        },
        "ID660271": {
            "person": {"id": 660271},
            "stats": {"batting": {"atBats": 3, "hits": 1, "homeRuns": 0, "rbi": 0}},
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
    assert all(r["player_id"] != "None" for r in result)


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_handles_non_numeric_values() -> None:
    """Malformed (non-numeric) stat values coerce to 0 instead of crashing."""
    from services.mlb_api import fetch_boxscore_batting

    home_players = {
        "ID660271": {
            "person": {"id": 660271},
            "stats": {
                "batting": {"atBats": 4, "hits": "N/A", "homeRuns": None, "rbi": "x"}
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
    assert result[0]["at_bats"] == 4
    assert result[0]["hits"] == 0
    assert result[0]["home_runs"] == 0
    assert result[0]["rbi"] == 0


@pytest.mark.asyncio
async def test_fetch_boxscore_batting_returns_empty_on_http_error() -> None:
    """Returns [] when the HTTP call fails."""
    import httpx

    from services.mlb_api import fetch_boxscore_batting

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("timeout"))
        result = await fetch_boxscore_batting("717948")

    assert result == []


# ---------------------------------------------------------------------------
# _parse_boxscore tests
# ---------------------------------------------------------------------------


def _make_full_boxscore_response() -> dict:
    """Build a /game/{gamePk}/boxscore response with batting order and pitchers."""
    return {
        "teams": {
            "home": {
                "team": {"id": 119, "name": "Los Angeles Dodgers"},
                "battingOrder": [660271, 592450],
                "pitchers": [808967],
                "players": {
                    "ID660271": {
                        "person": {"id": 660271, "fullName": "Shohei Ohtani"},
                        "position": {"abbreviation": "DH"},
                        "battingOrder": "300",
                        "stats": {
                            "batting": {
                                "atBats": 4, "runs": 2, "hits": 2, "doubles": 1,
                                "homeRuns": 1, "rbi": 3, "baseOnBalls": 1, "strikeOuts": 1,
                            }
                        },
                        "seasonStats": {"batting": {"avg": ".314"}},
                    },
                    "ID592450": {
                        "person": {"id": 592450, "fullName": "Mookie Betts"},
                        "position": {"abbreviation": "SS"},
                        "battingOrder": "100",
                        "stats": {
                            "batting": {
                                "atBats": 3, "runs": 1, "hits": 1, "doubles": 0,
                                "homeRuns": 0, "rbi": 1, "baseOnBalls": 1, "strikeOuts": 0,
                            }
                        },
                        "seasonStats": {"batting": {"avg": ".280"}},
                    },
                    "ID808967": {
                        "person": {"id": 808967, "fullName": "Yoshinobu Yamamoto"},
                        "position": {"abbreviation": "P"},
                        "battingOrder": "",
                        "stats": {
                            "pitching": {
                                "inningsPitched": "7.0", "hits": 4, "runs": 2,
                                "earnedRuns": 2, "baseOnBalls": 1, "strikeOuts": 9, "homeRuns": 1,
                            }
                        },
                        "seasonStats": {"pitching": {"era": "2.88"}},
                    },
                },
            },
            "away": {
                "team": {"id": 147, "name": "New York Yankees"},
                "battingOrder": [999001],
                "pitchers": [],
                "players": {
                    "ID999001": {
                        "person": {"id": 999001, "fullName": "Aaron Judge"},
                        "position": {"abbreviation": "RF"},
                        "battingOrder": "200",
                        "stats": {
                            "batting": {
                                "atBats": 4, "runs": 0, "hits": 0, "doubles": 0,
                                "homeRuns": 0, "rbi": 0, "baseOnBalls": 0, "strikeOuts": 2,
                            }
                        },
                        "seasonStats": {"batting": {"avg": ".290"}},
                    },
                },
            },
        }
    }


def test_parse_boxscore_batting_order() -> None:
    """Batters are returned in batting order extracted from battingOrder field."""
    from services.mlb_api import _parse_boxscore

    result = _parse_boxscore(_make_full_boxscore_response())
    home_batters = result["home"]["batters"]

    assert len(home_batters) == 2
    # ID592450 has battingOrder "100" → order 1, ID660271 has "300" → order 3
    assert home_batters[0]["player_id"] == "660271"  # first in battingOrder list
    assert home_batters[0]["batting_order"] == 3
    assert home_batters[1]["player_id"] == "592450"
    assert home_batters[1]["batting_order"] == 1


def test_parse_boxscore_is_analyzable_flag() -> None:
    """Japanese players have is_analyzable=True; non-Japanese have False."""
    from services.mlb_api import _parse_boxscore

    result = _parse_boxscore(_make_full_boxscore_response())
    home_batters = {b["player_id"]: b for b in result["home"]["batters"]}

    assert home_batters["660271"]["is_analyzable"] is True   # 大谷翔平 in PLAYER_NAMES_JA
    assert home_batters["592450"]["is_analyzable"] is False  # Mookie Betts


def test_parse_boxscore_japanese_name_fallback() -> None:
    """Japanese players get name_ja from PLAYER_NAMES_JA; others fall back to fullName."""
    from services.mlb_api import _parse_boxscore

    result = _parse_boxscore(_make_full_boxscore_response())
    home_batters = {b["player_id"]: b for b in result["home"]["batters"]}

    assert home_batters["660271"]["name_ja"] == "大谷翔平"
    assert home_batters["592450"]["name_ja"] == "Mookie Betts"  # fallback to fullName


def test_parse_boxscore_pitchers() -> None:
    """Pitchers include innings_pitched and era from seasonStats."""
    from services.mlb_api import _parse_boxscore

    result = _parse_boxscore(_make_full_boxscore_response())
    home_pitchers = result["home"]["pitchers"]

    assert len(home_pitchers) == 1
    p = home_pitchers[0]
    assert p["player_id"] == "808967"
    assert p["is_analyzable"] is True   # 山本由伸 in PLAYER_NAMES_JA
    assert p["innings_pitched"] == "7.0"
    assert p["strikeouts"] == 9
    assert p["era"] == pytest.approx(2.88)


def test_parse_boxscore_team_names() -> None:
    """Team names include both English and Japanese."""
    from services.mlb_api import _parse_boxscore

    result = _parse_boxscore(_make_full_boxscore_response())

    assert result["home"]["team_en"] == "Los Angeles Dodgers"
    assert result["home"]["team_ja"] == "ロサンゼルス・ドジャース"
    assert result["away"]["team_en"] == "New York Yankees"
    assert result["away"]["team_ja"] == "ニューヨーク・ヤンキース"


def test_parse_boxscore_empty_teams() -> None:
    """Returns empty batters/pitchers lists when API response has no team data."""
    from services.mlb_api import _parse_boxscore

    result = _parse_boxscore({"teams": {}})

    assert result["home"]["batters"] == []
    assert result["home"]["pitchers"] == []
    assert result["away"]["batters"] == []
    assert result["away"]["pitchers"] == []


@pytest.mark.asyncio
async def test_fetch_boxscore_returns_empty_on_http_error() -> None:
    """Returns {} when the HTTP call fails."""
    import httpx
    from services.mlb_api import _boxscore_cache, fetch_boxscore

    _boxscore_cache.clear()

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("timeout"))
        result = await fetch_boxscore("717948")

    assert result == {}
