from __future__ import annotations

import base64
from pathlib import Path

from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.models import VlmMatch
from app.vlm.base import VlmScorer, build_prompt, mime_type_for_path, parse_matches_from_text


class ClaudeScorer(VlmScorer):
    def __init__(self) -> None:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required when VLM_PROVIDER=claude.")
        try:
            import anthropic
        except ImportError as exc:
            raise RuntimeError("anthropic is not installed. Run pip install -r requirements.txt.") from exc
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    @retry(wait=wait_exponential(multiplier=1, min=1, max=8), stop=stop_after_attempt(3))
    def score_sheet(
        self,
        *,
        sheet_path: str,
        target_description: str,
        reference_image_path: str | None,
        crop_ids: list[str],
    ) -> list[VlmMatch]:
        content: list[dict] = [_image_block(sheet_path)]
        if reference_image_path:
            content.append(_image_block(reference_image_path))
        content.append({"type": "text", "text": build_prompt(target_description, crop_ids)})

        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=2048,
            temperature=0,
            system="Return only valid JSON. Do not include markdown or commentary.",
            messages=[{"role": "user", "content": content}],
        )
        text = _text_from_response(response)
        return parse_matches_from_text(text, crop_ids)


def _image_block(path: str | Path) -> dict:
    image_path = Path(path)
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": mime_type_for_path(image_path),
            "data": base64.b64encode(image_path.read_bytes()).decode("ascii"),
        },
    }


def _text_from_response(response: object) -> str:
    chunks: list[str] = []
    for block in getattr(response, "content", []):
        if getattr(block, "type", None) == "text":
            chunks.append(getattr(block, "text", ""))
    return "\n".join(chunks).strip()
