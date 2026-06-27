from __future__ import annotations

import hashlib

from app.models import VlmMatch
from app.vlm.base import VlmScorer


class MockScorer(VlmScorer):
    def score_sheet(
        self,
        *,
        sheet_path: str,
        target_description: str,
        reference_image_path: str | None,
        crop_ids: list[str],
    ) -> list[VlmMatch]:
        ranked = sorted(crop_ids, key=lambda crop_id: _hash_int(crop_id))
        keep_count = min(len(ranked), 5 + (_hash_int("|".join(crop_ids)) % 6))
        selected = ranked[:keep_count]

        matches: list[VlmMatch] = []
        for crop_id in selected:
            value = _hash_int(crop_id)
            score = 50 + (value % 31)
            matches.append(
                VlmMatch(
                    crop_id=crop_id,
                    score=score,
                    matched_attributes=["visible person crop", "possible clothing match"],
                    missing_or_unclear_attributes=["mock scoring cannot inspect visual details"],
                    reason="Mock scorer result; configure ANTHROPIC_API_KEY and VLM_PROVIDER=claude for real scoring.",
                )
            )
        return sorted(matches, key=lambda match: match.score, reverse=True)


def _hash_int(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:12], 16)
