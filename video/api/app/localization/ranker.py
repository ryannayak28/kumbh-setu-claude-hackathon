from __future__ import annotations

from app.config import settings
from app.localization.nashik_gazetteer import (
    ALLOWED_NASHIK_ZONES,
    clue_matches_by_zone,
    source_result_zone,
    zone_source_result,
)
from app.localization.schemas import CandidateLocation, EventHint, EvidenceFrame, LocationClue, SourceResult


def rank_candidate_locations(
    *,
    source_results: list[SourceResult],
    clues: list[LocationClue],
    evidence_frames: list[EvidenceFrame],
    event_hint: EventHint,
    top_k: int | None = None,
) -> list[CandidateLocation]:
    top_k = top_k or settings.localization_top_location_results
    ranked: list[tuple[float, CandidateLocation]] = []
    matches_by_zone = clue_matches_by_zone(clues)

    for zone_index, zone in enumerate(ALLOWED_NASHIK_ZONES, start=1):
        matched = matches_by_zone[zone.zone_id]
        zone_results = [
            result
            for result in source_results
            if (source_result_zone(result) or (None, None))[0] == zone
        ]
        relation_score = _zone_relation_score(zone_results, matched)
        zone_result = zone_source_result(
            zone=zone,
            raw_score=relation_score,
            matched_clues=matched,
        )
        all_results = [zone_result, *zone_results]
        sources = sorted({result.source for result in all_results})

        label = (
            "likely"
            if relation_score >= 0.72
            else "possible"
            if relation_score >= 0.45
            else "weak"
        )
        location = CandidateLocation(
            candidate_location_id=f"LOC_{zone_index:03d}",
            name=zone.name,
            lat=zone.lat,
            lng=zone.lng,
            confidence=round(relation_score, 2),
            confidence_label=label,
            radius_m=zone.radius_m,
            zone_id=zone.zone_id,
            zone_name=zone.name,
            zone_relation_score=round(relation_score, 2),
            within_allowed_zone=True,
            matched_clues=[clue.value for clue in matched],
            evidence_frame_ids=_evidence_ids_for_clues(matched, evidence_frames),
            sources=sources,
            source_results=all_results,
            uncertainties=_uncertainties(label, sources, bool(matched)),
            map_url=zone_result.url,
        )
        ranked.append((location.zone_relation_score, location))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [location for _, location in ranked[:top_k]]


def _zone_relation_score(
    source_results: list[SourceResult],
    matched_clues: list[LocationClue],
) -> float:
    external_results = [result for result in source_results if result.source != "nashik_zone"]
    external_sources = {result.source for result in external_results}
    source_support = min(1.0, len(external_sources) / 2)
    source_score = max((result.raw_score or 0.0) for result in external_results) if external_results else 0.0

    if matched_clues:
        clue_confidence = sum(clue.confidence for clue in matched_clues) / len(matched_clues)
        score = 0.72 + min(0.12, 0.04 * len(matched_clues))
        score += 0.08 * source_support + 0.05 * source_score + 0.03 * clue_confidence
        return min(0.97, score)

    if external_results:
        return min(0.68, 0.45 + 0.15 * source_support + 0.08 * source_score)

    return 0.3


def _evidence_ids_for_clues(
    matched: list[LocationClue],
    evidence_frames: list[EvidenceFrame],
) -> list[str]:
    ids: list[str] = []
    for clue in matched:
        for frame_id in clue.frame_ids:
            if frame_id not in ids:
                ids.append(frame_id)
    if ids:
        return ids[:6]
    return [frame.frame_id for frame in evidence_frames if frame.selected_for_vlm][:3]


def _uncertainties(label: str, sources: list[str], has_zone_clue: bool) -> list[str]:
    items = ["This is an allowed Nashik zone, not an exact GPS fix."]
    if label != "likely":
        items.append("The extracted clues are not enough to claim a tight location inside the zone.")
    if not has_zone_clue:
        items.append("No OCR/VLM clue directly matched this zone; shown as a low-confidence allowed-area lead.")
    if set(sources) == {"nashik_zone"}:
        items.append("No external map source corroborated this zone.")
    return items
