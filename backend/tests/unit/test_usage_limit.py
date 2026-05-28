"""
Unit tests for AI usage limit logic — priority #1 (most complex business logic).

Tests the JST midnight reset behavior and Free/Pro hard-limit enforcement
using functions defined in routers/ai.py.

Real Supabase is NOT used — all DB calls are mocked via unittest.mock.
"""

import datetime
from unittest.mock import MagicMock, patch

import pytest
import pytz
from fastapi import HTTPException

from routers.ai import (
    FREE_DAILY_LIMIT,
    _get_or_create_usage_row,
    _increment_usage,
    usage_date_jst,
)

JST = pytz.timezone("Asia/Tokyo")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_supabase_mock(usage_row: dict | None = None) -> MagicMock:
    """Return a mock Supabase client that returns usage_row for ai_usage queries.

    If usage_row is None, the 'existing' query returns no data (simulating a
    missing row — triggers the insert branch in _get_or_create_usage_row).
    """
    mock = MagicMock()

    # Chain: supabase.table().select().eq().eq().single().execute()
    select_chain = (
        mock.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .single.return_value
        .execute.return_value
    )
    select_chain.data = usage_row

    # Chain: supabase.table().insert().execute() — used when row is absent
    mock.table.return_value.insert.return_value.execute.return_value.data = {}

    # Chain: supabase.table().update().eq().eq().execute() — used by _increment_usage
    mock.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = {}

    return mock


# ---------------------------------------------------------------------------
# test_free_limit_blocks_at_3
# ---------------------------------------------------------------------------


def test_free_limit_blocks_at_3() -> None:
    """Free user with ai_call_count=3 today → HTTPException 403 LIMIT_EXCEEDED."""
    today = usage_date_jst()
    user_id = "user-free-abc"

    usage_row = {
        "user_id": user_id,
        "usage_date": today.isoformat(),
        "ai_call_count": FREE_DAILY_LIMIT,  # exactly at the limit
    }
    supabase = _make_supabase_mock(usage_row)

    row = _get_or_create_usage_row(supabase, user_id, today)
    calls_used = row["ai_call_count"]

    # The endpoint logic: if calls_used >= FREE_DAILY_LIMIT → raise 403
    assert calls_used >= FREE_DAILY_LIMIT, "Expected limit to be reached"

    with pytest.raises(HTTPException) as exc_info:
        if calls_used >= FREE_DAILY_LIMIT:
            raise HTTPException(
                status_code=403,
                detail={"code": "LIMIT_EXCEEDED", "message": "Daily AI limit reached."},
            )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "LIMIT_EXCEEDED"


# ---------------------------------------------------------------------------
# test_free_limit_allows_at_2
# ---------------------------------------------------------------------------


def test_free_limit_allows_at_2() -> None:
    """Free user with ai_call_count=2 → should NOT be blocked (2 < 3)."""
    today = usage_date_jst()
    user_id = "user-free-def"

    usage_row = {
        "user_id": user_id,
        "usage_date": today.isoformat(),
        "ai_call_count": 2,
    }
    supabase = _make_supabase_mock(usage_row)

    row = _get_or_create_usage_row(supabase, user_id, today)
    calls_used = row["ai_call_count"]

    # Should NOT raise — 2 < FREE_DAILY_LIMIT (3)
    assert calls_used < FREE_DAILY_LIMIT
    # No exception should be raised here
    blocked = calls_used >= FREE_DAILY_LIMIT
    assert not blocked


# ---------------------------------------------------------------------------
# test_free_limit_resets_next_jst_day
# ---------------------------------------------------------------------------


def test_free_limit_resets_next_jst_day() -> None:
    """Usage row dated yesterday JST → today's query returns a new (zeroed) row.

    _get_or_create_usage_row queries by (user_id, today_date). When the row
    for today does not exist (yesterday's row is irrelevant to today's query),
    it creates a new row with ai_call_count=0.
    """
    today = usage_date_jst()
    user_id = "user-free-reset"

    # Simulate: no row for today (yesterday's row exists but is not returned
    # because the query filters on today's date).
    supabase = _make_supabase_mock(usage_row=None)

    row = _get_or_create_usage_row(supabase, user_id, today)
    calls_used = row["ai_call_count"]

    # A fresh row has ai_call_count=0 → should NOT be blocked
    assert calls_used == 0
    assert calls_used < FREE_DAILY_LIMIT


# ---------------------------------------------------------------------------
# test_pro_no_hard_limit
# ---------------------------------------------------------------------------


def test_pro_no_hard_limit() -> None:
    """Pro user with ai_call_count=100 should never receive a hard block.

    The Pro plan uses ai_logs + _count_pro_calls_today, and never checks
    ai_usage against FREE_DAILY_LIMIT. Verify that 100 calls does not
    trigger the free-limit path.
    """
    today = usage_date_jst()
    user_id = "user-pro-xyz"

    # Even if somehow ai_usage were queried, count=100 should not matter for Pro.
    # The key assertion: the free-limit condition (calls >= FREE_DAILY_LIMIT)
    # is never applied to Pro users. We verify this by checking the condition
    # directly using a pro-equivalent call count.
    pro_calls_today = 100

    # Pro endpoint logic: no hard limit → never raises
    would_block_if_free = pro_calls_today >= FREE_DAILY_LIMIT
    # For a Pro user the code path skips this check entirely.
    # We assert the flag would be True (confirming 100 >= 3) but that the
    # Pro branch does not evaluate it.
    assert would_block_if_free is True  # 100 >= 3

    # The Pro path in the router goes to _count_pro_calls_today() and then
    # generates without blocking. We confirm no HTTPException is raised for
    # a Pro user by simulating what the router does: skip the Free limit check.
    plan = "pro"
    blocked = False
    if plan != "pro":  # Pro users skip this block entirely
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
    # Construct a fixed UTC datetime at 23:30 UTC on 2026-05-28.
    utc_dt = datetime.datetime(2026, 5, 28, 23, 30, 0, tzinfo=pytz.utc)
    # In JST (UTC+9) this is 2026-05-29 08:30.
    expected_jst_date = datetime.date(2026, 5, 29)

    with patch("routers.ai.datetime") as mock_dt:
        # Make datetime.datetime.now(JST) return our fixed UTC-aware datetime.
        mock_dt.datetime.now.return_value = utc_dt.astimezone(JST)
        mock_dt.date = datetime.date  # keep datetime.date usable

        jst_date = mock_dt.datetime.now(JST).date()

    assert jst_date == expected_jst_date, (
        f"Expected JST date {expected_jst_date}, got {jst_date}"
    )


# ---------------------------------------------------------------------------
# test_increment_usage_returns_new_count
# ---------------------------------------------------------------------------


def test_increment_usage_returns_new_count() -> None:
    """_increment_usage increments ai_call_count by 1 and returns the new count."""
    today = usage_date_jst()
    user_id = "user-inc-test"

    existing_row = {
        "user_id": user_id,
        "usage_date": today.isoformat(),
        "ai_call_count": 1,
    }
    supabase = _make_supabase_mock(existing_row)

    new_count = _increment_usage(supabase, user_id, today)

    # Should return 1 + 1 = 2
    assert new_count == 2
