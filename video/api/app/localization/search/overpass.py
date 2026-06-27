from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.localization.schemas import EventHint, LocationClue, SourceResult


class OverpassSearch:
    name = "overpass"

    @classmethod
    def from_settings(cls) -> "OverpassSearch":
        return cls()

    def search_by_clues(
        self,
        clues: list[LocationClue],
        event_hint: EventHint,
        cache_dir: Path | None = None,
    ) -> list[SourceResult]:
        if not settings.overpass_enabled or event_hint.approx_center is None:
            return []
        return []

