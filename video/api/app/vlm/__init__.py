from app.config import settings
from app.vlm.base import VlmScorer
from app.vlm.claude import ClaudeScorer
from app.vlm.mock import MockScorer


def get_scorer() -> VlmScorer:
    if settings.vlm_provider == "claude":
        return ClaudeScorer()
    return MockScorer()


__all__ = ["get_scorer", "VlmScorer"]
