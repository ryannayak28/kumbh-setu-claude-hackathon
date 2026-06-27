from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.models import VlmMatch
from app.utils.json_parse import extract_json_object


PROMPT_TEMPLATE = """You are helping search a POV/event video for a lost person.

Target appearance:
{target_description}

You will see a contact sheet containing numbered person crops from the video.
Each crop has a visible crop_id label such as CROP_000123 and a timestamp label such as 03:12.

Task:
Score each crop for how likely it matches the target appearance.

Use only visible evidence:
- clothing type and color
- bags
- footwear if visible
- accessories
- headwear
- body silhouette only when useful
- nearby companions only if mentioned in the target description

Rules:
- Do not identify the person by face.
- Do not claim certainty.
- Be high-recall: include plausible partial matches.
- Do not hallucinate hidden details.
- If the crop is blurry, occluded, or too small, mark the unclear attributes.
- Only include crops with score >= 50.
- Return valid JSON only. No markdown. No commentary.

Valid crop IDs in this sheet:
{crop_ids_csv}

Return exactly this shape:
{{
  "matches": [
    {{
      "crop_id": "CROP_000001",
      "score": 0,
      "matched_attributes": ["string"],
      "missing_or_unclear_attributes": ["string"],
      "reason": "short explanation based only on visible evidence"
    }}
  ]
}}
"""


class VlmScorer(Protocol):
    def score_sheet(
        self,
        *,
        sheet_path: str,
        target_description: str,
        reference_image_path: str | None,
        crop_ids: list[str],
    ) -> list[VlmMatch]:
        ...


def build_prompt(target_description: str, crop_ids: list[str]) -> str:
    return PROMPT_TEMPLATE.format(
        target_description=target_description,
        crop_ids_csv=", ".join(crop_ids),
    )


def mime_type_for_path(path: str | Path) -> str:
    suffix = Path(path).suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".png":
        return "image/png"
    if suffix == ".webp":
        return "image/webp"
    return "application/octet-stream"


def parse_matches_from_text(text: str, valid_crop_ids: list[str]) -> list[VlmMatch]:
    payload = extract_json_object(text)
    matches_raw = payload.get("matches", [])
    if not isinstance(matches_raw, list):
        raise ValueError("VLM JSON must contain a matches array.")

    valid = set(valid_crop_ids)
    matches: list[VlmMatch] = []
    for item in matches_raw:
        match = VlmMatch.model_validate(item)
        if match.crop_id in valid and match.score >= 50:
            matches.append(match)
    return matches

