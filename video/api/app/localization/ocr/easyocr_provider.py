from __future__ import annotations

from app.localization.ocr.base import OCRProvider
from app.localization.schemas import EvidenceFrame, OCRBlock


class EasyOCRProvider(OCRProvider):
    name = "easyocr"

    def __init__(self) -> None:
        try:
            import easyocr
        except ImportError as exc:
            raise RuntimeError("easyocr is not installed.") from exc
        self.reader = easyocr.Reader(["en"], gpu=False)

    def extract_text(self, frames: list[EvidenceFrame]) -> list[OCRBlock]:
        blocks: list[OCRBlock] = []
        for frame in frames:
            try:
                results = self.reader.readtext(frame.image_path)
            except Exception:
                continue
            for bbox, text, confidence in results[:25]:
                clean = str(text).strip()
                if not clean:
                    continue
                flat_bbox = [float(value) for point in bbox for value in point]
                blocks.append(
                    OCRBlock(
                        frame_id=frame.frame_id,
                        text=clean,
                        confidence=float(confidence),
                        bbox=flat_bbox,
                    )
                )
        return blocks

