from __future__ import annotations

from app.localization.schemas import EvidenceFrame, OCRBlock


def select_context_frames_for_vlm(
    *,
    frames: list[EvidenceFrame],
    ocr_blocks: list[OCRBlock],
    max_frames: int,
    center_ts: float,
) -> list[EvidenceFrame]:
    ocr_by_frame: dict[str, list[str]] = {}
    for block in ocr_blocks:
        ocr_by_frame.setdefault(block.frame_id, []).append(block.text)

    scored: list[tuple[float, EvidenceFrame]] = []
    for frame in frames:
        ocr_texts = ocr_by_frame.get(frame.frame_id, [])
        ocr_bonus = min(1.0, len(" ".join(ocr_texts)) / 40.0)
        sharpness = min(1.0, (frame.sharpness or 0.0) / 500.0)
        proximity = max(0.0, 1.0 - abs(frame.timestamp_sec - center_ts) / 60.0)
        score = 0.55 * ocr_bonus + 0.25 * sharpness + 0.20 * proximity
        scored.append((score, frame))

    scored.sort(key=lambda item: item[0], reverse=True)
    selected = [frame for _, frame in scored[:max_frames]]
    selected.sort(key=lambda frame: frame.timestamp_sec)

    selected_ids = {frame.frame_id for frame in selected}
    for frame in frames:
        frame.selected_for_vlm = frame.frame_id in selected_ids
        frame.ocr_text = ocr_by_frame.get(frame.frame_id, [])

    return selected

