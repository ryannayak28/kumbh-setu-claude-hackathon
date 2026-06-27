from __future__ import annotations

import re

from app.localization.schemas import EventHint, EvidenceFrame, LocationClue, OCRBlock, SearchQuery
from app.localization.vlm_clues.base import VLMClueProvider, VLMClueResult


class MockVLMClueProvider(VLMClueProvider):
    name = "mock"

    def extract_location_clues(
        self,
        *,
        frames: list[EvidenceFrame],
        ocr_blocks: list[OCRBlock],
        event_hint: EventHint,
    ) -> VLMClueResult:
        clues: list[LocationClue] = []
        seen: set[str] = set()
        frame_by_id = {frame.frame_id: frame for frame in frames}

        for block in ocr_blocks:
            text = _clean_text(block.text)
            if not text:
                continue
            normalized = _normalize(text)
            if normalized in seen:
                continue
            seen.add(normalized)
            clue_type = "natural_feature" if "godavari" in normalized else "text_sign"
            frame = frame_by_id.get(block.frame_id)
            clues.append(
                LocationClue(
                    clue_id=f"CLUE_{len(clues) + 1:03d}",
                    type=clue_type,
                    value=text.title() if text.isupper() else text,
                    normalized_value=normalized,
                    confidence=min(0.95, block.confidence or 0.72),
                    frame_ids=[block.frame_id],
                    timestamp_mmss=frame.timestamp_mmss if frame else None,
                    why_it_matters="Readable event signage can narrow the search area.",
                )
            )

        if not clues:
            fallback_frame = frames[len(frames) // 2] if frames else None
            frame_ids = [fallback_frame.frame_id] if fallback_frame else []
            clues.extend(
                [
                    LocationClue(
                        clue_id="CLUE_001",
                        type="text_sign",
                        value="Ramkund",
                        normalized_value="ramkund",
                        confidence=0.86,
                        frame_ids=frame_ids,
                        timestamp_mmss=fallback_frame.timestamp_mmss if fallback_frame else None,
                        why_it_matters="Ramkund is an allowed Nashik Godavari zone anchor.",
                    ),
                    LocationClue(
                        clue_id="CLUE_002",
                        type="natural_feature",
                        value="Godavari Ghat",
                        normalized_value="godavari ghat",
                        confidence=0.78,
                        frame_ids=frame_ids,
                        timestamp_mmss=fallback_frame.timestamp_mmss if fallback_frame else None,
                        why_it_matters="Godavari ghat clues should map to the Ramkund/Godaghat corridor.",
                    ),
                ]
            )

        if all("barricade" not in clue.normalized_value for clue in clues):
            frame_ids = [frames[0].frame_id] if frames else []
            clues.append(
                LocationClue(
                    clue_id=f"CLUE_{len(clues) + 1:03d}",
                    type="event_structure",
                    value="Police barricade route",
                    normalized_value="police barricade route",
                    confidence=0.62,
                    frame_ids=frame_ids,
                    timestamp_mmss=frames[0].timestamp_mmss if frames else None,
                    why_it_matters="Barricaded crowd routes often align with event-sector movement plans.",
                )
            )

        frame_summaries = {
            frame.frame_id: "Context frame selected for route signage, crowd barriers, or event structure clues."
            for frame in frames[:24]
        }
        city = event_hint.city or "Nashik / Trimbakeshwar"
        event = event_hint.event_name or "Nashik-Trimbakeshwar Simhastha"
        return VLMClueResult(
            clues=clues,
            suggested_queries=[
                SearchQuery(
                    query_id="QUERY_VLM_001",
                    query=f"Ramkund Godavari Godaghat {city} {event}",
                    source_clue_ids=[clue.clue_id for clue in clues[:2]],
                )
            ],
            frame_summaries=frame_summaries,
            warnings=["Mock clue provider used; treat coordinates as demo leads."],
        )


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()
