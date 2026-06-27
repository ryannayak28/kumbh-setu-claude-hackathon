from __future__ import annotations

import json


def extract_json_object(text: str) -> dict:
    """
    Parse a JSON object from model output.

    Handles surrounding whitespace, markdown fences, and short text wrappers.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Model output did not contain a JSON object.")

    candidate = cleaned[start : end + 1]
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Could not parse JSON object from model output: {exc}") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Model output JSON was not an object.")
    return parsed

