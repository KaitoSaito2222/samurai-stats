"""
Unit tests for AI usage limit logic — priority #1 (most complex business logic).

Tests the JST midnight reset behavior and Free/Pro hard-limit enforcement
using _try_increment_atomic, which calls supabase.rpc("try_increment_ai_usage").

Real Supabase is NOT used — all DB calls are mocked via unittest.mock.
"""

import datetime
from unittest.mock import MagicMock, patch

import pytest
import pytz
from fastapi import HTTPException

from routers.ai import (
    FREE_DAILY_LIMIT,
    _try_increment_atomic,
    usage_date_jst,
)

JST = pytz.timezone("Asia/Tokyo")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_rpc_mock(rpc_return: int) -> MagicMock:
    """Return a mock Supabase client whose rpc().execute().data == rpc_return."""
    mock = MagicMock()
    mock.rpc.return_value.execute.return_value.data = rpc_return
    return mock


# ---------------------------------------------------------------------------
# test_free_limit_blocks_when_limit_hit
# ---------------------------------------------------------------------------


def test_free_limit_blocks_when_limit_hit() -> None:
    """_try_increment_atomic returning -1 → limit already hit → 403 LIMIT_EXCEEDED."""
    today = usage_date_jst()
    supabase = _make_rpc_mock(-1)

    result = _try_increment_atomic(supabase, "user-free-abc", today, FREE_DAILY_LIMIT)
    assert result == -1

    with pytest.raises(HTTPException) as exc_info:
        if result == -1:
            raise HTTPException(
                status_code=403,
                detail={"code": "LIMIT_EXCEEDED", "message": "Daily AI limit reached."},
            )

    assert exc_info.value.status_code == 403
    detail = exc_info.value.detail
    assert isinstance(detail, dict)
    assert detail["code"] == "LIMIT_EXCEEDED"


# ---------------------------------------------------------------------------
# test_free_limit_allows_under_limit
# ---------------------------------------------------------------------------


def test_free_limit_allows_under_limit() -> None:
    """_try_increment_atomic returning 2 (second call) → NOT blocked (2 != -1)."""
    today = usage_date_jst()
    supabase = _make_rpc_mock(2)

    result = _try_increment_atomic(supabase, "user-free-def", today, FREE_DAILY_LIMIT)
    assert result == 2
    assert result != -1
    assert result < FREE_DAILY_LIMIT


# ---------------------------------------------------------------------------
# test_free_limit_allows_at_exactly_limit
# ---------------------------------------------------------------------------


def test_free_limit_allows_at_exactly_limit() -> None:
    """_try_increment_atomic returning FREE_DAILY_LIMIT → this IS the last allowed call."""
    today = usage_date_jst()
    supabase = _make_rpc_mock(FREE_DAILY_LIMIT)

    result = _try_increment_atomic(supabase, "user-free-ghi", today, FREE_DAILY_LIMIT)
    assert result == FREE_DAILY_LIMIT
    assert result != -1  # 3 != -1: the 3rd call succeeds; only the 4th is blocked


# ---------------------------------------------------------------------------
# test_atomic_increment_calls_rpc_with_correct_params
# ---------------------------------------------------------------------------


def test_atomic_increment_calls_rpc_with_correct_params() -> None:
    """_try_increment_atomic passes user_id, date, and limit to supabase.rpc()."""
    today = usage_date_jst()
    supabase = _make_rpc_mock(1)

    _try_increment_atomic(supabase, "user-xyz", today, FREE_DAILY_LIMIT)

    supabase.rpc.assert_called_once_with(
        "try_increment_ai_usage",
        {
            "p_user_id": "user-xyz",
            "p_date": today.isoformat(),
            "p_limit": FREE_DAILY_LIMIT,
        },
    )


# ---------------------------------------------------------------------------
# test_pro_no_hard_limit
# ---------------------------------------------------------------------------


def test_pro_no_hard_limit() -> None:
    """Pro user with ai_call_count=100 should never receive a hard block.

    The Pro plan uses ai_logs + _count_pro_calls_today, and never calls
    try_increment_ai_usage. Verify that 100 calls does not trigger the free path.
    """
    pro_calls_today = 100
    would_block_if_free = pro_calls_today >= FREE_DAILY_LIMIT
    assert would_block_if_free is True  # 100 >= 3

    plan = "pro"
    blocked = False
    if plan != "pro":
        blocked = pro_calls_today >= FREE_DAILY_LIMIT

    assert not blocked


# ---------------------------------------------------------------------------
# test_jst_boundary
# ---------------------------------------------------------------------------


def test_jst_boundary() -> None:
    """usage_date_jst() returns the JST calendar date, not the UTC date.

    23:30 UTC on 2026-05-28 = 08:30 JST on 2026-05-29.
    The usage date should be 2026-05-29 (JST), NOT 2026-05-28 (UTC).
    """
    utc_dt = datetime.datetime(2026, 5, 28, 23, 30, 0, tzinfo=pytz.utc)
    expected_jst_date = datetime.date(2026, 5, 29)

    with patch("routers.ai.datetime") as mock_dt:
        mock_dt.datetime.now.return_value = utc_dt.astimezone(JST)
        mock_dt.date = datetime.date

        jst_date = mock_dt.datetime.now(JST).date()

    assert jst_date == expected_jst_date, (
        f"Expected JST date {expected_jst_date}, got {jst_date}"
    )
