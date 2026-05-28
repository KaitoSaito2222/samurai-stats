"""
Baseball Savant (Statcast) data service.

Fetches per-player Statcast CSV from baseballsavant.mlb.com and aggregates
exit velocity, barrel rate, hard-hit rate, launch angle, xBA, xSLG, pitch
splits, and zone stats.

CSV endpoint:
  https://baseballsavant.mlb.com/statcast_search/csv
      ?player_id={id}&type=batter&year={season}&player_type=batter
"""

import csv
import io
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SAVANT_BASE = "https://baseballsavant.mlb.com"
SAVANT_TIMEOUT = 30.0  # seconds
SAVANT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SamuraiStats/1.0)",
    "Accept": "text/csv,*/*",
}

# PA-ending event codes in the Statcast `events` column.
PA_EVENTS: set[str] = {
    "single",
    "double",
    "triple",
    "home_run",
    "strikeout",
    "strikeout_double_play",
    "walk",
    "intent_walk",
    "hit_by_pitch",
    "field_out",
    "force_out",
    "grounded_into_double_play",
    "double_play",
    "triple_play",
    "fielders_choice",
    "fielders_choice_out",
    "sac_fly",
    "sac_bunt",
    "sac_fly_double_play",
    "sac_bunt_double_play",
    "catcher_interf",
    "other_out",
}

HIT_EVENTS: set[str] = {"single", "double", "triple", "home_run"}

SWING_DESCRIPTIONS: set[str] = {
    "hit_into_play",
    "hit_into_play_no_out",
    "hit_into_play_score",
    "foul",
    "foul_tip",
    "swinging_strike",
    "swinging_strike_blocked",
}

WHIFF_DESCRIPTIONS: set[str] = {
    "swinging_strike",
    "swinging_strike_blocked",
    "foul_tip",
}

# Minimum PA threshold for a pitch type to appear in pitch_splits.
MIN_PITCH_PA = 5

PITCH_NAMES_JA: dict[str, str] = {
    "FF": "フォーシーム",
    "SI": "シンカー",
    "FC": "カットボール",
    "SL": "スライダー",
    "CU": "カーブ",
    "CH": "チェンジアップ",
    "FS": "スプリット",
    "ST": "スイーパー",
    "KC": "ナックルカーブ",
    "FA": "フォーシーム",
    "FT": "ツーシーム",
}

PITCH_NAMES_EN: dict[str, str] = {
    "FF": "4-Seam Fastball",
    "SI": "Sinker",
    "FC": "Cutter",
    "SL": "Slider",
    "CU": "Curveball",
    "CH": "Changeup",
    "FS": "Splitter",
    "ST": "Sweeper",
    "KC": "Knuckle-Curve",
    "FA": "Fastball",
    "FT": "2-Seam Fastball",
}


def _safe_float(value: str) -> float | None:
    """Parse a string to float; return None if empty or unparseable."""
    stripped = value.strip()
    if not stripped:
        return None
    try:
        return float(stripped)
    except ValueError:
        return None


def _safe_int(value: str) -> int | None:
    """Parse a string to int; return None if empty or unparseable."""
    stripped = value.strip()
    if not stripped:
        return None
    try:
        return int(stripped)
    except ValueError:
        return None


def _aggregate(rows: list[dict[str, str]]) -> dict[str, Any]:
    """Aggregate raw Statcast CSV rows into the analytics payload.

    For pitcher data (rows with release_speed populated in >50% of rows),
    also computes velocity_by_month: average release_speed per pitch type
    per calendar month, for detecting fatigue or injury recovery trends.
    """

    # ── Overall / batted-ball aggregates ────────────────────────────────────
    exit_velocities: list[float] = []
    launch_angles: list[float] = []
    xba_values: list[float] = []
    xslg_values: list[float] = []
    total_batted_balls = 0
    barrel_count = 0
    hard_hit_count = 0

    # ── Pitch-split accumulators ─────────────────────────────────────────────
    # pitch_type → {"pa": int, "hits": int, "hr": int, "k": int,
    #               "swings": int, "whiffs": int}
    pitch_acc: dict[str, dict[str, int]] = {}

    # ── Zone accumulators ───────────────────────────────────────────────────
    # zone (1-9) → {"pa": int, "hits": int}
    zone_acc: dict[int, dict[str, int]] = {}

    # ── Velocity-by-month accumulators (pitchers only) ──────────────────────
    # (pitch_type, month) → list of release_speed floats
    velocity_acc: dict[tuple[str, int], list[float]] = {}

    for row in rows:
        launch_speed_raw = row.get("launch_speed", "").strip()
        launch_angle_raw = row.get("launch_angle", "").strip()
        launch_speed_angle_raw = row.get("launch_speed_angle", "").strip()
        events_raw = row.get("events", "").strip()
        description_raw = row.get("description", "").strip()
        pitch_type_raw = row.get("pitch_type", "").strip()
        zone_raw = row.get("zone", "").strip()
        xba_raw = row.get("estimated_ba_using_speedangle", "").strip()
        xslg_raw = row.get("estimated_slg_using_speedangle", "").strip()
        release_speed_raw = row.get("release_speed", "").strip()
        game_date_raw = row.get("game_date", "").strip()

        launch_speed = _safe_float(launch_speed_raw)

        # Batted-ball stats (rows where launch_speed is present).
        if launch_speed is not None:
            total_batted_balls += 1
            exit_velocities.append(launch_speed)

            if launch_speed >= 95:
                hard_hit_count += 1

            # Barrel: Baseball Savant codes barrels as launch_speed_angle == "6".
            if launch_speed_angle_raw == "6":
                barrel_count += 1

        launch_angle = _safe_float(launch_angle_raw)
        if launch_angle is not None:
            launch_angles.append(launch_angle)

        xba = _safe_float(xba_raw)
        if xba is not None:
            xba_values.append(xba)

        xslg = _safe_float(xslg_raw)
        if xslg is not None:
            xslg_values.append(xslg)

        # ── Pitch splits ────────────────────────────────────────────────────
        if pitch_type_raw:
            if pitch_type_raw not in pitch_acc:
                pitch_acc[pitch_type_raw] = {
                    "pa": 0,
                    "hits": 0,
                    "hr": 0,
                    "k": 0,
                    "swings": 0,
                    "whiffs": 0,
                }
            acc = pitch_acc[pitch_type_raw]

            if events_raw in PA_EVENTS:
                acc["pa"] += 1
                if events_raw in HIT_EVENTS:
                    acc["hits"] += 1
                if events_raw == "home_run":
                    acc["hr"] += 1
                if events_raw in ("strikeout", "strikeout_double_play"):
                    acc["k"] += 1

            if description_raw in SWING_DESCRIPTIONS:
                acc["swings"] += 1
            if description_raw in WHIFF_DESCRIPTIONS:
                acc["whiffs"] += 1

        # ── Zone stats (zones 1-9 only) ──────────────────────────────────────
        zone_int = _safe_int(zone_raw)
        if zone_int is not None and 1 <= zone_int <= 9:
            if zone_int not in zone_acc:
                zone_acc[zone_int] = {"pa": 0, "hits": 0}
            zacc = zone_acc[zone_int]

            if events_raw in PA_EVENTS:
                zacc["pa"] += 1
                if events_raw in HIT_EVENTS:
                    zacc["hits"] += 1

        # ── Velocity by month (pitcher rows have release_speed) ───────────────
        release_speed = _safe_float(release_speed_raw)
        if release_speed is not None and pitch_type_raw and game_date_raw:
            # Parse month from "YYYY-MM-DD" format.
            try:
                month = int(game_date_raw[5:7])
            except (ValueError, IndexError):
                month = 0
            if month > 0:
                vel_key: tuple[str, int] = (pitch_type_raw, month)
                if vel_key not in velocity_acc:
                    velocity_acc[vel_key] = []
                velocity_acc[vel_key].append(release_speed)

    # ── Detect pitcher vs batter ─────────────────────────────────────────────
    # Pitcher data has release_speed populated in >50% of rows.
    release_speed_count: int = sum(
        1 for row in rows if row.get("release_speed", "").strip()
    )
    is_pitcher: bool = len(rows) > 0 and release_speed_count / len(rows) > 0.5

    # ── Build output dict ────────────────────────────────────────────────────
    result: dict[str, Any] = {
        "exit_velocity_avg": (
            round(sum(exit_velocities) / len(exit_velocities), 1)
            if exit_velocities
            else None
        ),
        "launch_angle_avg": (
            round(sum(launch_angles) / len(launch_angles), 1)
            if launch_angles
            else None
        ),
        "barrel_rate": (
            round(barrel_count / total_batted_balls * 100, 1)
            if total_batted_balls
            else None
        ),
        "hard_hit_rate": (
            round(hard_hit_count / total_batted_balls * 100, 1)
            if total_batted_balls
            else None
        ),
        "xba": (
            round(sum(xba_values) / len(xba_values), 3)
            if xba_values
            else None
        ),
        "xslg": (
            round(sum(xslg_values) / len(xslg_values), 3)
            if xslg_values
            else None
        ),
    }

    # Pitch splits (skip pitch types with fewer than MIN_PITCH_PA PAs).
    pitch_splits: list[dict[str, Any]] = []
    for pitch_type, acc in sorted(pitch_acc.items()):
        pa = acc["pa"]
        if pa < MIN_PITCH_PA:
            continue
        hits = acc["hits"]
        swings = acc["swings"]
        whiffs = acc["whiffs"]
        avg = round(hits / pa, 3) if pa else None
        whiff_rate = round(whiffs / swings * 100, 1) if swings else None
        pitch_splits.append(
            {
                "pitch_type": pitch_type,
                "pitch_name_ja": PITCH_NAMES_JA.get(pitch_type, pitch_type),
                "pitch_name_en": PITCH_NAMES_EN.get(pitch_type, pitch_type),
                "pa": pa,
                "avg": avg,
                "whiff_rate": whiff_rate,
                "hr": acc["hr"],
                "k": acc["k"],
            }
        )
    result["pitch_splits"] = pitch_splits

    # Zone stats (zones 1-9, sorted).
    zone_stats: list[dict[str, Any]] = []
    for zone in sorted(zone_acc.keys()):
        zacc = zone_acc[zone]
        pa = zacc["pa"]
        hits = zacc["hits"]
        avg = round(hits / pa, 3) if pa else None
        zone_stats.append({"zone": zone, "pa": pa, "avg": avg})
    result["zone_stats"] = zone_stats

    # Velocity by month (pitchers only).
    # Only include pitch types with PA >= MIN_PITCH_PA and months with >= 3 pitches.
    velocity_by_month: list[dict[str, Any]] = []
    if is_pitcher:
        eligible_pitch_types: set[str] = {
            pt for pt, acc in pitch_acc.items() if acc["pa"] >= MIN_PITCH_PA
        }
        for (pitch_type, month), speeds in sorted(velocity_acc.items()):
            if pitch_type not in eligible_pitch_types:
                continue
            if len(speeds) < 3:
                continue
            velocity_by_month.append(
                {
                    "month": month,
                    "pitch_type": pitch_type,
                    "pitch_name_ja": PITCH_NAMES_JA.get(pitch_type, pitch_type),
                    "pitch_name_en": PITCH_NAMES_EN.get(pitch_type, pitch_type),
                    "avg_velocity": round(sum(speeds) / len(speeds), 1),
                }
            )
    result["velocity_by_month"] = velocity_by_month

    return result


async def fetch_statcast_aggregated(
    player_id: str, season: int
) -> dict[str, Any]:
    """Fetch and aggregate Statcast data for a batter from Baseball Savant.

    Fetches CSV data from the Statcast search endpoint and returns aggregated
    metrics. Returns an empty dict on any error (network failure, HTTP error,
    CSV parse error, empty data).

    Args:
        player_id: MLB Stats API player ID (numeric string, e.g. "660271").
        season: The MLB season year.

    Returns:
        Aggregated Statcast dict, or {} on failure.
    """
    url = f"{SAVANT_BASE}/statcast_search/csv"
    params: dict[str, str | int] = {
        "player_id": player_id,
        "type": "batter",
        "year": season,
        "player_type": "batter",
    }

    try:
        async with httpx.AsyncClient(
            timeout=SAVANT_TIMEOUT,
            headers=SAVANT_HEADERS,
            follow_redirects=True,
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error(
            "fetch_statcast_aggregated player_id=%s season=%d failed: %s",
            player_id,
            season,
            exc,
        )
        return {}

    try:
        text = response.text
        reader = csv.DictReader(io.StringIO(text))
        rows: list[dict[str, str]] = list(reader)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "fetch_statcast_aggregated CSV parse error player_id=%s: %s",
            player_id,
            exc,
        )
        return {}

    if not rows:
        logger.warning(
            "fetch_statcast_aggregated returned no rows player_id=%s season=%d",
            player_id,
            season,
        )
        return {}

    try:
        return _aggregate(rows)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "fetch_statcast_aggregated aggregation error player_id=%s: %s",
            player_id,
            exc,
        )
        return {}
