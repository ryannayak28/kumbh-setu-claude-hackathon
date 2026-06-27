from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from app.config import settings
from app.localization.schemas import EventHint, SearchQuery, SourceResult
from app.utils.files import read_json, write_json


class NominatimSearch:
    name = "nominatim"
    _last_request_ts = 0.0

    def __init__(self, base_url: str, user_agent: str, enabled: bool) -> None:
        self.base_url = base_url.rstrip("/")
        self.user_agent = user_agent
        self.enabled = enabled

    @classmethod
    def from_settings(cls) -> "NominatimSearch":
        return cls(
            base_url=settings.nominatim_base_url,
            user_agent=settings.nominatim_user_agent,
            enabled=settings.nominatim_enabled,
        )

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
            out.extend(self._search_one(query.query, event_hint, cache_dir))
        return out

    def _search_one(
        self,
        query: str,
        event_hint: EventHint,
        cache_dir: Path | None,
    ) -> list[SourceResult]:
        cache_path = _cache_path(cache_dir, "nominatim", query)
        if cache_path:
            cached = read_json(cache_path)
            if cached is not None:
                return [SourceResult.model_validate(item) for item in cached]

        params: dict[str, object] = {
            "q": query,
            "format": "jsonv2",
            "limit": 5,
            "addressdetails": 1,
        }
        if event_hint.approx_center:
            lat = event_hint.approx_center.lat
            lng = event_hint.approx_center.lng
            delta = max(0.02, event_hint.search_radius_m / 111000.0)
            params["viewbox"] = f"{lng - delta},{lat + delta},{lng + delta},{lat - delta}"
            params["bounded"] = 0

        self._throttle()
        url = f"{self.base_url}/search?{urllib.parse.urlencode(params)}"
        request = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return []

        results: list[SourceResult] = []
        for index, item in enumerate(data):
            try:
                lat = float(item["lat"])
                lng = float(item["lon"])
            except Exception:
                continue
            display = item.get("display_name") or "Unknown OSM result"
            results.append(
                SourceResult(
                    source=self.name,
                    name=item.get("name") or display.split(",")[0],
                    address=display,
                    lat=lat,
                    lng=lng,
                    raw_score=max(0.1, 0.85 - index * 0.1),
                    metadata={
                        "class": item.get("class"),
                        "type": item.get("type"),
                        "query": query,
                    },
                )
            )
        if cache_path:
            write_json(cache_path, [result.model_dump(mode="json") for result in results])
        return results

    def _throttle(self) -> None:
        elapsed = time.time() - self.__class__._last_request_ts
        if elapsed < 1.05:
            time.sleep(1.05 - elapsed)
        self.__class__._last_request_ts = time.time()


def _cache_path(cache_dir: Path | None, provider: str, query: str) -> Path | None:
    if cache_dir is None:
        return None
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()[:16]
    return cache_dir / f"{provider}_{digest}.json"

