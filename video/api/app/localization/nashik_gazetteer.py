from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, radians, sin, sqrt

from app.localization.schemas import LocationClue, SourceResult


@dataclass(frozen=True)
class NashikZone:
    zone_id: str
    name: str
    lat: float
    lng: float
    radius_m: int
    aliases: tuple[str, ...]
    query_terms: tuple[str, ...]


ALLOWED_NASHIK_ZONES: tuple[NashikZone, ...] = (
    NashikZone(
        zone_id="NASHIK_GODAVARI_RAMKUND",
        name="Godavari Ramkund corridor",
        lat=20.0072639,
        lng=73.7924901,
        radius_m=1200,
        aliases=(
            "ramkund",
            "ram kund",
            "godaghat",
            "goda ghat",
            "godavari",
            "panchavati",
            "ganga godavari",
            "ghat",
        ),
        query_terms=("Ramkund", "Godavari", "Godaghat", "Panchavati", "Nashik"),
    ),
    NashikZone(
        zone_id="KUSHAWARTA_TRIMBAK",
        name="Kushawarta Kund / Trimbak area",
        lat=19.9321202,
        lng=73.5307549,
        radius_m=800,
        aliases=(
            "kushawarta",
            "kushavart",
            "kusavarta",
            "kusavart",
            "kushavarta",
            "trimbak",
            "trimbakeshwar",
            "brahmagiri",
            "godavari source",
        ),
        query_terms=("Kushawarta Kund", "Trimbakeshwar", "Trimbak", "Godavari source", "Nashik"),
    ),
)


def allowed_zone_ids() -> list[str]:
    return [zone.zone_id for zone in ALLOWED_NASHIK_ZONES]


def zone_by_id(zone_id: str | None) -> NashikZone | None:
    if zone_id is None:
        return None
    for zone in ALLOWED_NASHIK_ZONES:
        if zone.zone_id == zone_id:
            return zone
    return None


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371000
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * radius * atan2(sqrt(a), sqrt(1 - a))


def normalize_for_zone_match(value: str) -> str:
    import re

    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\s]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def clue_matches_by_zone(clues: list[LocationClue]) -> dict[str, list[LocationClue]]:
    out: dict[str, list[LocationClue]] = {zone.zone_id: [] for zone in ALLOWED_NASHIK_ZONES}
    for clue in clues:
        haystack = normalize_for_zone_match(f"{clue.value} {clue.normalized_value}")
        for zone in ALLOWED_NASHIK_ZONES:
            if any(normalize_for_zone_match(alias) in haystack for alias in zone.aliases):
                out[zone.zone_id].append(clue)
    return out


def alias_match_debug(clues: list[LocationClue]) -> dict[str, list[str]]:
    return {
        zone_id: [clue.value for clue in matches]
        for zone_id, matches in clue_matches_by_zone(clues).items()
    }


def source_result_zone(result: SourceResult) -> tuple[NashikZone, float] | None:
    metadata_zone = zone_by_id(str(result.metadata.get("zone_id") or ""))
    if metadata_zone is not None:
        return metadata_zone, haversine_m(result.lat, result.lng, metadata_zone.lat, metadata_zone.lng)

    for zone in ALLOWED_NASHIK_ZONES:
        distance = haversine_m(result.lat, result.lng, zone.lat, zone.lng)
        if distance <= zone.radius_m:
            return zone, distance
    return None


def filter_results_to_allowed_zones(
    source_results: list[SourceResult],
) -> tuple[list[SourceResult], int]:
    kept: list[SourceResult] = []
    discarded = 0
    for result in source_results:
        zone_match = source_result_zone(result)
        if zone_match is None:
            discarded += 1
            continue
        zone, distance_m = zone_match
        metadata = dict(result.metadata)
        metadata.update(
            {
                "zone_id": zone.zone_id,
                "zone_name": zone.name,
                "zone_distance_m": round(distance_m, 2),
            }
        )
        kept.append(result.model_copy(update={"metadata": metadata}))
    return kept, discarded


def zone_source_result(
    *,
    zone: NashikZone,
    raw_score: float,
    matched_clues: list[LocationClue],
) -> SourceResult:
    return SourceResult(
        source="nashik_zone",
        name=zone.name,
        address="Nashik district, Maharashtra, India",
        lat=zone.lat,
        lng=zone.lng,
        raw_score=raw_score,
        url=f"https://www.google.com/maps/search/?api=1&query={zone.lat},{zone.lng}",
        metadata={
            "zone_id": zone.zone_id,
            "zone_name": zone.name,
            "zone_relation_score": raw_score,
            "alias_matches": [clue.value for clue in matched_clues],
        },
    )
