"""
Unit tests for MLB Stats API response parsing functions in services/mlb_api.py.

No real HTTP calls are made — httpx is mocked where needed.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.mlb_api import fetch_japanese_players, map_game_status


# ---------------------------------------------------------------------------
# map_game_status — pure function tests (no I/O needed)
# ---------------------------------------------------------------------------


def test_map_game_status_live() -> None:
    """abstractGameState='Live' → 'live'."""
    result = map_game_status("Live", "In Progress")
    assert result == "live"


def test_map_game_status_postponed() -> None:
    """abstractGameState='Final', detailedState='Postponed' → 'postponed'."""
    result = map_game_status("Final", "Postponed")
    assert result == "postponed"


def test_map_game_status_cancelled() -> None:
    """abstractGameState='Final', detailedState='Cancelled' → 'cancelled'."""
    result = map_game_status("Final", "Cancelled")
    assert result == "cancelled"


def test_map_game_status_suspended() -> None:
    """abstractGameState='Final', detailedState='Suspended' → 'cancelled'."""
    result = map_game_status("Final", "Suspended")
    assert result == "cancelled"


def test_map_game_status_final() -> None:
    """abstractGameState='Final', detailedState='Final' → 'final'."""
    result = map_game_status("Final", "Final")
    assert result == "final"


def test_map_game_status_preview_scheduled() -> None:
    """abstractGameState='Preview' → 'scheduled'."""
    result = map_game_status("Preview", "Scheduled")
    assert result == "scheduled"


def test_map_game_status_unknown_abstract() -> None:
    """Unknown abstractGameState → falls back to 'scheduled'."""
    result = map_game_status("Unknown", "")
    assert result == "scheduled"


# ---------------------------------------------------------------------------
# fetch_japanese_players — filters birthCountry == "Japan"
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_japanese_players_filters_birth_country() -> None:
    """fetch_japanese_players returns only players with birthCountry='Japan'."""
    from tests.mocks.mlb_api import make_sports_players_response

    fake_response_data = make_sports_players_response()
    # Contains 3 players: Ohtani (Japan), Trout (USA), Yoshida (Japan)

    mock_response = MagicMock()
    mock_response.json.return_value = fake_response_data
    mock_response.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_response)
        result = await fetch_japanese_players(season=2026)

    # Only Japan-born players should be returned
    assert len(result) == 2
    player_names = {p["fullName"] for p in result}
    assert "Shohei Ohtani" in player_names
    assert "Yoshida Masataka" in player_names
    assert "Mike Trout" not in player_names


@pytest.mark.asyncio
async def test_fetch_japanese_players_returns_correct_fields() -> None:
    """fetch_japanese_players returns normalized dicts with required keys."""
    from tests.mocks.mlb_api import make_sports_players_response

    fake_response_data = make_sports_players_response()

    mock_response = MagicMock()
    mock_response.json.return_value = fake_response_data
    mock_response.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_response)
        result = await fetch_japanese_players(season=2026)

    required_keys = {"id", "fullName", "currentTeam", "currentTeamId", "position", "active"}
    for player in result:
        assert required_keys.issubset(player.keys()), (
            f"Missing keys in {player}: expected {required_keys}"
        )
        # id should be a string
        assert isinstance(player["id"], str)


@pytest.mark.asyncio
async def test_fetch_japanese_players_returns_empty_on_http_error() -> None:
    """fetch_japanese_players returns [] when the HTTP call raises an error."""
    import httpx

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("Connection refused"))
        result = await fetch_japanese_players(season=2026)

    assert result == []


@pytest.mark.asyncio
async def test_fetch_japanese_players_empty_response() -> None:
    """fetch_japanese_players returns [] when the API returns zero players."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"people": []}
    mock_response.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_response)
        result = await fetch_japanese_players(season=2026)

    assert result == []


@pytest.mark.asyncio
async def test_fetch_japanese_players_no_japan_players() -> None:
    """fetch_japanese_players returns [] when no player has birthCountry='Japan'."""
    from tests.mocks.mlb_api import make_sports_players_response

    # Override with only non-Japan players
    non_japan_players = [
        {
            "id": 545361,
            "fullName": "Mike Trout",
            "birthCountry": "USA",
            "currentTeam": {"id": 108},
            "primaryPosition": {"abbreviation": "CF"},
            "active": True,
        }
    ]
    fake_response_data = make_sports_players_response(non_japan_players)

    mock_response = MagicMock()
    mock_response.json.return_value = fake_response_data
    mock_response.raise_for_status.return_value = None

    with patch("services.mlb_api._client") as mock_client:
        mock_client.get = AsyncMock(return_value=mock_response)
        result = await fetch_japanese_players(season=2026)

    assert result == []
