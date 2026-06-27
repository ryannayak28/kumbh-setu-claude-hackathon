from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.localization.schemas import EventHint, SearchQuery, SourceResult


class WebGroundingSearch:
    name = "web_grounding"

    @classmethod
    def from_settings(cls) -> "WebGroundingSearch":
        return cls()

    def search_many(
        self,
        queries: list[SearchQuery],
        event_hint: EventHint,
        cache_dir: Path | None = None,
    ) -> list[SourceResult]:
        if settings.web_grounding_provider == "none":
            return []
        return []

