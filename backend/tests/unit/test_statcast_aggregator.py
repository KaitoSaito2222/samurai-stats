"""
Unit tests for services/baseball_savant.py's _aggregate() function.

Tests verify correct computation of barrel rate, hard-hit rate, exit velocity
average, zone stats filtering (zones 1-9 only), and the pitch-split PA threshold.

No HTTP calls are made — _aggregate() is a pure function over list[dict[str, str]].
"""

import pytest

from services.baseball_savant import MIN_PITCH_PA, _aggregate


# ---------------------------------------------------------------------------
# Helper row factory
# ---------------------------------------------------------------------------


def _make_row(
    launch_speed: str = "",
    launch_angle: str = "",
    launch_speed_angle: str = "",
    events: str = "",
    description: str = "",
    pitch_type: str = "FF",
    zone: str = "",
    xba: str = "",
    xslg: str = "",
) -> dict[str, str]:
    """Return a minimal Statcast CSV row dict."""
    return {
        "launch_speed": launch_speed,
        "launch_angle": launch_angle,
        "launch_speed_angle": launch_speed_angle,
        "events": events,
        "description": description,
        "pitch_type": pitch_type,
        "zone": zone,
        "estimated_ba_using_speedangle": xba,
        "estimated_slg_using_speedangle": xslg,
    }


# ---------------------------------------------------------------------------
# test_barrel_rate_calculation
# ---------------------------------------------------------------------------


def test_barrel_rate_calculation() -> None:
    """Barrel rate = (rows with launch_speed_angle==6) / (rows with launch_speed) * 100."""
    rows = [
        # 2 barrels out of 5 batted balls → 40.0%
        _make_row(launch_speed="100.0", launch_speed_angle="6"),
        _make_row(launch_speed="102.0", launch_speed_angle="6"),
        _make_row(launch_speed="85.0", launch_speed_angle="1"),
        _make_row(launch_speed="90.0", launch_speed_angle="5"),
        _make_row(launch_speed="95.0", launch_speed_angle="3"),
        # Non-batted-ball rows (no launch_speed) — do not affect count
        _make_row(launch_speed=""),
    ]
    result = _aggregate(rows)
    assert result["barrel_rate"] == pytest.approx(40.0, abs=0.1)


def test_barrel_rate_none_when_no_batted_balls() -> None:
    """barrel_rate is None when there are no rows with launch_speed."""
    rows = [_make_row(launch_speed="")]
    result = _aggregate(rows)
    assert result["barrel_rate"] is None


# ---------------------------------------------------------------------------
# test_hard_hit_rate
# ---------------------------------------------------------------------------


def test_hard_hit_rate() -> None:
    """Hard-hit rate = (rows with launch_speed >= 95) / total_batted_balls * 100."""
    rows = [
        _make_row(launch_speed="97.0"),   # hard hit
        _make_row(launch_speed="95.0"),   # exactly 95 → hard hit
        _make_row(launch_speed="94.9"),   # below threshold
        _make_row(launch_speed="80.0"),   # below threshold
    ]
    result = _aggregate(rows)
    # 2 hard hits out of 4 batted balls = 50.0%
    assert result["hard_hit_rate"] == pytest.approx(50.0, abs=0.1)


def test_hard_hit_rate_none_when_no_batted_balls() -> None:
    """hard_hit_rate is None when there are no rows with launch_speed."""
    rows = [_make_row()]
    result = _aggregate(rows)
    assert result["hard_hit_rate"] is None


# ---------------------------------------------------------------------------
# test_exit_velocity_avg
# ---------------------------------------------------------------------------


def test_exit_velocity_avg() -> None:
    """exit_velocity_avg is the mean of all non-null launch_speed values."""
    rows = [
        _make_row(launch_speed="90.0"),
        _make_row(launch_speed="100.0"),
        _make_row(launch_speed="110.0"),
        _make_row(launch_speed=""),   # null/empty — must be ignored
        _make_row(launch_speed="  "), # whitespace — must be ignored
    ]
    result = _aggregate(rows)
    expected = round((90.0 + 100.0 + 110.0) / 3, 1)
    assert result["exit_velocity_avg"] == pytest.approx(expected, abs=0.1)


def test_exit_velocity_avg_none_when_empty() -> None:
    """exit_velocity_avg is None when all launch_speed values are empty."""
    rows = [_make_row(launch_speed=""), _make_row(launch_speed="")]
    result = _aggregate(rows)
    assert result["exit_velocity_avg"] is None


# ---------------------------------------------------------------------------
# test_zone_stats_in_zone_only
# ---------------------------------------------------------------------------


def test_zone_stats_in_zone_only() -> None:
    """zone_stats includes only zones 1-9; zones 10-14 are excluded."""
    rows = [
        # In-zone PAs (zones 1-9)
        _make_row(zone="1", events="single"),
        _make_row(zone="5", events="field_out"),
        _make_row(zone="9", events="home_run"),
        # Out-of-zone PAs (zones 10-14) — must be excluded
        _make_row(zone="11", events="single"),
        _make_row(zone="13", events="field_out"),
        _make_row(zone="14", events="walk"),
        # Non-PA pitch — zone present but no PA event
        _make_row(zone="3", events=""),
    ]
    result = _aggregate(rows)
    zone_zones = {z["zone"] for z in result["zone_stats"]}

    # Must contain zones 1, 5, 9 (all had PA events)
    assert 1 in zone_zones
    assert 5 in zone_zones
    assert 9 in zone_zones

    # Must NOT contain zones outside 1-9
    assert 11 not in zone_zones
    assert 13 not in zone_zones
    assert 14 not in zone_zones

    # Verify PA counts for included zones
    zone_map = {z["zone"]: z for z in result["zone_stats"]}
    assert zone_map[1]["pa"] == 1
    assert zone_map[5]["pa"] == 1
    assert zone_map[9]["pa"] == 1


def test_zone_stats_avg_calculation() -> None:
    """zone_stats avg is computed as hits / pa for each zone."""
    rows = [
        # Zone 2: 3 PA, 1 hit → avg = 0.333
        _make_row(zone="2", events="single"),
        _make_row(zone="2", events="field_out"),
        _make_row(zone="2", events="strikeout"),
    ]
    result = _aggregate(rows)
    zone_map = {z["zone"]: z for z in result["zone_stats"]}
    assert zone_map[2]["pa"] == 3
    assert zone_map[2]["avg"] == pytest.approx(0.333, abs=0.001)


# ---------------------------------------------------------------------------
# test_pitch_splits_pa_threshold
# ---------------------------------------------------------------------------


def test_pitch_splits_pa_threshold() -> None:
    """Pitch types with PA < MIN_PITCH_PA (5) are excluded from pitch_splits."""
    rows = []
    # FF: 6 PAs — should be included
    for _ in range(6):
        rows.append(_make_row(pitch_type="FF", events="field_out"))
    # SL: 4 PAs — should be excluded (below threshold)
    for _ in range(4):
        rows.append(_make_row(pitch_type="SL", events="field_out"))

    result = _aggregate(rows)
    pitch_types = {p["pitch_type"] for p in result["pitch_splits"]}

    assert "FF" in pitch_types, "FF (6 PAs) should be included"
    assert "SL" not in pitch_types, "SL (4 PAs) should be excluded (< MIN_PITCH_PA)"


def test_pitch_splits_exactly_at_threshold() -> None:
    """Pitch type with exactly MIN_PITCH_PA PAs is included."""
    rows = [_make_row(pitch_type="CH", events="field_out") for _ in range(MIN_PITCH_PA)]
    result = _aggregate(rows)
    pitch_types = {p["pitch_type"] for p in result["pitch_splits"]}
    assert "CH" in pitch_types, f"CH ({MIN_PITCH_PA} PAs) should be included"


def test_pitch_splits_avg_and_whiff_rate() -> None:
    """pitch_splits avg and whiff_rate are computed correctly."""
    rows = [
        # 5 PAs: 2 hits (single), 3 outs
        _make_row(pitch_type="FF", events="single", description="hit_into_play"),
        _make_row(pitch_type="FF", events="single", description="hit_into_play"),
        _make_row(pitch_type="FF", events="field_out", description="hit_into_play"),
        _make_row(pitch_type="FF", events="strikeout", description="swinging_strike"),
        _make_row(pitch_type="FF", events="field_out", description="hit_into_play"),
    ]
    result = _aggregate(rows)
    ff = next((p for p in result["pitch_splits"] if p["pitch_type"] == "FF"), None)
    assert ff is not None
    assert ff["pa"] == 5
    assert ff["avg"] == pytest.approx(0.400, abs=0.001)  # 2 hits / 5 PA
    # Swings: 5 (all hit_into_play + swinging_strike), Whiffs: 1 (swinging_strike)
    assert ff["whiff_rate"] == pytest.approx(20.0, abs=0.1)  # 1/5 * 100


# ---------------------------------------------------------------------------
# test_empty_rows
# ---------------------------------------------------------------------------


def test_aggregate_empty_rows() -> None:
    """_aggregate with an empty row list returns None for all metrics."""
    result = _aggregate([])
    assert result["exit_velocity_avg"] is None
    assert result["barrel_rate"] is None
    assert result["hard_hit_rate"] is None
    assert result["launch_angle_avg"] is None
    assert result["xba"] is None
    assert result["xslg"] is None
    assert result["pitch_splits"] == []
    assert result["zone_stats"] == []
