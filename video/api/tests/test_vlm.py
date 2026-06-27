import pytest

from app.config import settings
from app.models import VlmMatch
from app.vlm import get_scorer
from app.vlm.base import parse_matches_from_text
from app.vlm.claude import ClaudeScorer, _text_from_response
from app.vlm.mock import MockScorer


def test_parse_matches_filters_hallucinated_crop_ids() -> None:
    text = """
    {
      "matches": [
        {
          "crop_id": "CROP_000001",
          "score": 88,
          "matched_attributes": ["white shirt"],
          "missing_or_unclear_attributes": [],
          "reason": "Visible white shirt."
        },
        {
          "crop_id": "CROP_999999",
          "score": 99,
          "matched_attributes": ["hallucinated"],
          "missing_or_unclear_attributes": [],
          "reason": "Not in sheet."
        }
      ]
    }
    """

    matches = parse_matches_from_text(text, ["CROP_000001"])
    assert len(matches) == 1
    assert matches[0].crop_id == "CROP_000001"


def test_parse_matches_accepts_fenced_json() -> None:
    text = """```json
    {"matches":[{"crop_id":"CROP_000002","score":71,"reason":"Possible match."}]}
    ```"""

    matches = parse_matches_from_text(text, ["CROP_000002"])
    assert matches == [VlmMatch(crop_id="CROP_000002", score=71, reason="Possible match.")]


def test_claude_response_text_extraction() -> None:
    class TextBlock:
        type = "text"
        text = '{"matches": []}'

    class Response:
        content = [TextBlock()]

    assert _text_from_response(Response()) == '{"matches": []}'


def test_claude_missing_key_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        ClaudeScorer()


def test_provider_factory_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vlm_provider", "mock")
    assert isinstance(get_scorer(), MockScorer)


def test_provider_factory_claude(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vlm_provider", "claude")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    assert isinstance(get_scorer(), ClaudeScorer)
