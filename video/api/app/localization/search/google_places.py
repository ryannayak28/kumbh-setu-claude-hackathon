from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

from app.config import settings
from app.localization.schemas import EventHint, SearchQuery, SourceResult


class GooglePlacesSearch:
    name = "google_places"

    def __init__(self, api_key: str | None, enabled: bool) -> None:
        self.api_key = api_key
        self.enabled = enabled and bool(api_key)

    @classmethod
    def from_settings(cls) -> "GooglePlacesSearch":
        return cls(api_key=settings.google_maps_api_key, enabled=settings.google_places_enabled)

    def search_many(
        self,
        queries: list[SearchQuery],
        event_hint: EventHint,
        cache_dir: Path | None = None,
    ) -> list[SourceResult]:
        if not self.enabled:
            return []
        out: list[SourceResult] = []
        for query in queries[:5]:
            out.extend(self._search_one(query.query, event_hint))
        return out

    def _search_one(self, text_query: str, event_hint: EventHint) -> list[SourceResult]:
        body: dict[str, object] = {"textQuery": text_query, "maxResultCount": 5}
        if event_hint.approx_center:
            body["locationBias"] = {
                "circle": {
                    "center": {
                        "latitude": event_hint.approx_center.lat,
                        "longitude": event_hint.approx_center.lng,
                    },
                    "radius": float(event_hint.search_radius_m),
                }
            }
        request = urllib.request.Request(
            "https://places.googleapis.com/v1/places:searchText",
            data=json.dumps(body).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key or "",
                "X-Goog-FieldMask": (
                    "places.displayName,places.formattedAddress,places.location,"
                    "places.googleMapsUri,places.types"
                ),
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return []

        results: list[SourceResult] = []
        for index, place in enumerate(data.get("places", [])):
            loc = place.get("location") or {}
            if "latitude" not in loc or "longitude" not in loc:
                continue
            results.append(
                SourceResult(
                    source=self.name,
                    name=(place.get("displayName") or {}).get("text") or "Unknown place",
                    address=place.get("formattedAddress"),
                    lat=float(loc["latitude"]),
                    lng=float(loc["longitude"]),
                    raw_score=max(0.1, 1.0 - index * 0.12),
                    url=place.get("googleMapsUri"),
                    metadata={"types": place.get("types", []), "query": text_query},
                )
            )
        return results

