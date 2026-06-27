from __future__ import annotations

import re

from app.config import settings
from app.localization.nashik_gazetteer import (
    ALLOWED_NASHIK_ZONES,
    clue_matches_by_zone,
    normalize_for_zone_match,
)
from app.localization.schemas import EventHint, LatLng, LocationClue, SearchQuery


def default_event_hint() -> EventHint:
    center = None
    if settings.default_event_center_lat is not None and settings.default_event_center_lng is not None:
        center = LatLng(lat=settings.default_event_center_lat, lng=settings.default_event_center_lng)
    keywords = [
        item.strip()
        for item in settings.default_event_keywords.split(",")
        if item.strip()
    ]
    return EventHint(
        event_name=settings.default_event_name,
        city=settings.default_event_city,
        country=settings.default_event_country,
        approx_center=center,
        search_radius_m=settings.default_event_radius_m,
        extra_keywords=keywords,
    )


def merge_event_hint(hint: EventHint | None) -> EventHint:
    base = default_event_hint()
    if hint is None:
        return base
    return EventHint(
        event_name=hint.event_name or base.event_name,
        city=hint.city or base.city,
        country=hint.country or base.country,
        approx_center=hint.approx_center or base.approx_center,
        search_radius_m=hint.search_radius_m or base.search_radius_m,
        extra_keywords=hint.extra_keywords or base.extra_keywords,
    )


def normalize_text(value: str) -> str:
    return normalize_for_zone_match(value)


def normalize_clues(clues: list[LocationClue]) -> list[LocationClue]:
    out: list[LocationClue] = []
    seen: set[str] = set()
    for clue in clues:
        normalized = normalize_text(clue.normalized_value or clue.value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        data = clue.model_dump()
        data["clue_id"] = f"CLUE_{len(out) + 1:03d}"
        data["normalized_value"] = normalized
        out.append(LocationClue.model_validate(data))
    return out


def generate_location_queries(
    *,
    clues: list[LocationClue],
    event_hint: EventHint,
    max_queries: int = 8,
) -> list[SearchQuery]:
    raw_queries: list[tuple[str, list[str]]] = []
    matches_by_zone = clue_matches_by_zone(clues)

    for zone in ALLOWED_NASHIK_ZONES:
        matched_clues = matches_by_zone[zone.zone_id]
        clue_ids = [clue.clue_id for clue in matched_clues]
        matched_values = [
            clue.value.strip()
            for clue in matched_clues
            if clue.confidence >= 0.55 and clue.value.strip()
        ]

        if matched_values:
            raw_queries.append(
                (
                    f"{' '.join(matched_values[:2])} {' '.join(zone.query_terms)}",
                    clue_ids,
                )
            )
        raw_queries.append((" ".join(zone.query_terms), clue_ids))

    raw_queries.extend(
        [
            ("Ramkund Godavari Godaghat Panchavati Nashik", []),
            ("Kushawarta Kund Trimbakeshwar Godavari source Nashik", []),
        ]
    )

    queries: list[SearchQuery] = []
    seen_queries: set[str] = set()
    for query, clue_ids in raw_queries:
        normalized = normalize_text(query)
        if normalized and normalized not in seen_queries:
            seen_queries.add(normalized)
            queries.append(
                SearchQuery(
                    query_id=f"QUERY_{len(queries) + 1:03d}",
                    query=query,
                    source_clue_ids=clue_ids,
                )
            )
        if len(queries) >= max_queries:
            break
    return queries


def merge_queries(*groups: list[SearchQuery], max_queries: int = 8) -> list[SearchQuery]:
    out: list[SearchQuery] = []
    seen: set[str] = set()
    for group in groups:
        for query in group:
            normalized = normalize_text(query.query)
            if normalized and normalized not in seen:
                seen.add(normalized)
                data = query.model_dump()
                data["query_id"] = f"QUERY_{len(out) + 1:03d}"
                out.append(SearchQuery.model_validate(data))
            if len(out) >= max_queries:
                return out
    return out
