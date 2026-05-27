"""
Claude API service for Pro-tier AI features (detailed analysis, chat).
Model: claude-sonnet-4-6

Phase 1: streaming skeleton only.
Phase 2: full SSE streaming with prompt caching and history management.
"""

from typing import AsyncGenerator

from anthropic import AsyncAnthropic

from services.prompts import player_chat_system_prompt

# Initialize the Anthropic async client at module level.
# Reads ANTHROPIC_API_KEY from the environment automatically.
client = AsyncAnthropic()

# Maximum number of conversation turns allowed in a single chat session.
# Enforced before calling the API to prevent cost abuse.
MAX_HISTORY_TURNS = 20


async def stream_player_chat(
    player: dict,
    recent_stats: dict,
    game_context: dict,
    history: list[dict],
    message: str,
) -> AsyncGenerator[str, None]:
    """
    Stream Claude response tokens for Pro player chat (Phase 2 feature).

    Yields raw text tokens as they arrive from the Claude API so that the
    FastAPI router can forward them to the client as Server-Sent Events.

    Args:
        player:       {"id", "name_en", "name_ja", "team", "position"}
        recent_stats: recent 30-day and season-total stats
        game_context: {"opponent", "venue", "game_date"}
        history:      previous conversation turns —
                      [{"role": "user"|"assistant", "content": str}, ...]
                      Must not exceed MAX_HISTORY_TURNS entries.
        message:      the user's latest message (placed in the "user" role only —
                      never interpolated into the system prompt)

    Yields:
        str: individual text tokens from the model.

    Raises:
        HTTPException 400: if len(history) > MAX_HISTORY_TURNS.

    Notes:
        - prompt caching (cache_control="ephemeral") is applied to the system
          prompt, which is stable across turns in a session, reducing latency
          and cost for multi-turn conversations.
        - User input is always passed as the final "user" message; it is never
          interpolated into the system prompt (prompt injection prevention).
    """
    from fastapi import HTTPException  # imported here to avoid circular imports

    # Validate history length before making any API call.
    if len(history) > MAX_HISTORY_TURNS:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_REQUEST",
                "message": f"History exceeds maximum of {MAX_HISTORY_TURNS} turns.",
            },
        )

    system_prompt = player_chat_system_prompt(player, recent_stats, game_context)

    # Build the messages list: existing history + current user message.
    # User input is always placed in the "user" role — never in the system prompt.
    messages: list[dict] = [*history, {"role": "user", "content": message}]

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        # Apply prompt caching to the system prompt. The system prompt contains
        # only structured data (player info, stats, game context) and is stable
        # across turns, making it an ideal cache candidate.
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
