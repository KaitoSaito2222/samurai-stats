"""
Stub helpers for Gemini and Claude AI APIs.

These return deterministic strings and never make real API calls.
Use these in unit/integration tests to avoid cost and non-determinism.

Usage example:
    from unittest.mock import patch, AsyncMock
    from tests.mocks.ai_api import GEMINI_SUMMARY_RESPONSE, CLAUDE_CHAT_RESPONSE

    with patch("services.gemini.generate_player_summary", AsyncMock(return_value=GEMINI_SUMMARY_RESPONSE)):
        ...
"""

# Deterministic stub responses — these strings never change across test runs.

GEMINI_SUMMARY_RESPONSE: str = (
    "大谷翔平は今季も絶好調！打率.300、20本塁打の活躍を見せています。"
)

GEMINI_ANALYSIS_RESPONSE: str = (
    "Ohtani continues to dominate on both sides. "
    "His .300 average and 1.000 OPS place him among the elite."
)

CLAUDE_CHAT_RESPONSE: str = (
    "大谷選手の最近のパフォーマンスについてお話します。"
)


def make_gemini_generate_content_response(text: str = GEMINI_SUMMARY_RESPONSE) -> object:
    """Return a minimal object that mimics google.generativeai GenerateContentResponse."""

    class _Part:
        def __init__(self, t: str) -> None:
            self.text = t

    class _Content:
        def __init__(self, t: str) -> None:
            self.parts = [_Part(t)]

    class _Candidate:
        def __init__(self, t: str) -> None:
            self.content = _Content(t)

    class _FakeResponse:
        def __init__(self, t: str) -> None:
            self.candidates = [_Candidate(t)]
            self.text = t

    return _FakeResponse(text)


def make_claude_message_response(text: str = CLAUDE_CHAT_RESPONSE) -> object:
    """Return a minimal object that mimics anthropic.types.Message."""

    class _TextBlock:
        type = "text"

        def __init__(self, t: str) -> None:
            self.text = t

    class _FakeMessage:
        def __init__(self, t: str) -> None:
            self.content = [_TextBlock(t)]
            self.stop_reason = "end_turn"
            self.usage = None

    return _FakeMessage(text)
