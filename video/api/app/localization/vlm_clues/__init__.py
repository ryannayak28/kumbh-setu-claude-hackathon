from __future__ import annotations

from app.localization.vlm_clues.base import VLMClueProvider
from app.localization.vlm_clues.mock import MockVLMClueProvider


def get_vlm_clue_provider() -> VLMClueProvider:
    return MockVLMClueProvider()


__all__ = ["VLMClueProvider", "get_vlm_clue_provider"]

