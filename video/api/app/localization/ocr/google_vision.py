from __future__ import annotations

from app.localization.ocr.base import OCRProvider
from app.localization.schemas import EvidenceFrame, OCRBlock


class GoogleVisionOCRProvider(OCRProvider):
    name = "google_vision"

    def __init__(self) -> None:
        try:
            from google.cloud import vision
        except ImportError as exc:
            raise RuntimeError("google-cloud-vision is not installed.") from exc
        self.vision = vision
        self.client = vision.ImageAnnotatorClient()

    def extract_text(self, frames: list[EvidenceFrame]) -> list[OCRBlock]:
        blocks: list[OCRBlock] = []
        for frame in frames:
            try:
                with open(frame.image_path, "rb") as handle:
                    image = self.vision.Image(content=handle.read())
                response = self.client.text_detection(image=image)
            except Exception:
                continue
            if getattr(response, "error", None) and response.error.message:
                continue
            for annotation in (response.text_annotations or [])[:25]:
                text = (annotation.description or "").strip()
                if not text:
                    continue
                bbox: list[float] = []
                if annotation.bounding_poly and annotation.bounding_poly.vertices:
                    for vertex in annotation.bounding_poly.vertices:
                        bbox.extend([float(vertex.x or 0), float(vertex.y or 0)])
                blocks.append(
                    OCRBlock(
                        frame_id=frame.frame_id,
                        text=text,
                        confidence=None,
                        bbox=bbox or None,
                    )
                )
        return blocks

