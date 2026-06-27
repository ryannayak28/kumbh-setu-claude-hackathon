from __future__ import annotations

from app.localization.ocr.base import OCRProvider
from app.localization.schemas import EvidenceFrame, OCRBlock


class MockOCRProvider(OCRProvider):
    name = "mock"

    def extract_text(self, frames: list[EvidenceFrame]) -> list[OCRBlock]:
        if not frames:
            return []
        mid = frames[len(frames) // 2]
        after = frames[min(len(frames) - 1, len(frames) // 2 + 1)]
        return [
            OCRBlock(frame_id=mid.frame_id, text="RAMKUND", confidence=0.9),
            OCRBlock(frame_id=after.frame_id, text="GODAVARI GHAT", confidence=0.82),
        ]
