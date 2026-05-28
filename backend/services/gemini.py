"""
Gemini API service for Free-tier AI features (quick summary, basic analysis).
Model: gemini-2.0-flash
"""

import asyncio
import os

import google.generativeai as genai
from fastapi import HTTPException

from services.prompts import player_analysis_prompt, player_summary_prompt

# Initialize Gemini client at module level using the GEMINI_API_KEY environment variable.
_api_key = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=_api_key)

# Timeout for Gemini API calls in seconds.
_GEMINI_TIMEOUT_SECONDS = 30


async def generate_player_summary(player: dict, stats: dict, lang: str) -> str:
    """
    Generate an AI quick summary for a player using gemini-2.0-flash.

    Args:
        player: {"id", "name_en", "name_ja", "team", "position"}
        stats:  {"batting": {...} | None, "pitching": {...} | None}
        lang:   "ja" | "en"

    Returns:
        The generated summary text.

    Raises:
        HTTPException 504: if the Gemini API does not respond within 30 seconds.
        HTTPException 503: on any Gemini API error.
    """
    prompt = player_summary_prompt(player, stats, lang)
    model = genai.GenerativeModel("gemini-2.0-flash")

    try:
        # Wrap the synchronous generate_content call in asyncio.wait_for so that
        # we can enforce a timeout without blocking the event loop indefinitely.
        response = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: model.generate_content(prompt),
            ),
            timeout=_GEMINI_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={
                "code": "GATEWAY_TIMEOUT",
                "message": "AI summary timed out. Please try again.",
            },
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI summary temporarily unavailable.",
            },
        )

    # Extract text from the response, falling back to an error message if the
    # response is empty or blocked by safety filters.
    try:
        text: str = response.text
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI summary temporarily unavailable.",
            },
        )

    return text


async def generate_player_analysis(player: dict, trends: dict, lang: str) -> str:
    """Generate AI detailed analysis using gemini-2.0-flash.

    Args:
        player: {"id", "name_en", "name_ja", "team", "position"}
        trends: multi-year and period-comparison stats dict
        lang:   "ja" | "en"

    Returns:
        The generated analysis text.

    Raises:
        HTTPException 504: if the Gemini API does not respond within 30 seconds.
        HTTPException 503: on any Gemini API error.
    """
    prompt = player_analysis_prompt(player, trends, lang)
    model = genai.GenerativeModel("gemini-2.0-flash")

    try:
        response = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: model.generate_content(prompt),
            ),
            timeout=_GEMINI_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"code": "GATEWAY_TIMEOUT", "message": "AI analysis timed out."},
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI analysis temporarily unavailable.",
            },
        )

    try:
        return response.text
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI analysis temporarily unavailable.",
            },
        )
