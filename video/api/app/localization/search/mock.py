from __future__ import annotations

from pathlib import Path

from app.localization.schemas import EventHint, SearchQuery, SourceResult


class MockLocationSearch:
    name = "mock"

    def search_many(
        self,
        queries: list[SearchQuery],
        event_hint: EventHint,
        cache_dir: Path | None = None,
    ) -> list[SourceResult]:
        center = event_hint.approx_center
        lat = center.lat if center else 25.4358
        lng = center.lng if center else 81.8463
        return [
            SourceResult(
                source="mock",
                name="Sector 12 / Pontoon Bridge 4 route",
                address=f"{event_hint.city or 'Prayagraj'}, {event_hint.country or 'India'}",
                lat=lat + 0.0021,
                lng=lng + 0.0034,
                raw_score=0.84,
                url=f"https://www.google.com/maps/search/?api=1&query={lat + 0.0021},{lng + 0.0034}",
                metadata={"query": queries[0].query if queries else "mock localization"},
            )
        ]

