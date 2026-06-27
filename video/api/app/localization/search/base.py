from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.localization.schemas import EventHint, SearchQuery, SourceResult


class LocationSearchProvider(Protocol):
    name: str

    def search_many(
        self,
        queries: list[SearchQuery],
        event_hint: EventHint,
        cache_dir: Path | None = None,
    ) -> list[SourceResult]:
        ...

