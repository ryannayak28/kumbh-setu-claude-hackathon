from __future__ import annotations

from app.config import settings
from app.localization.ocr.base import NullOCRProvider, OCRProvider
from app.localization.ocr.mock import MockOCRProvider


def get_ocr_provider() -> OCRProvider:
    if settings.ocr_provider == "none":
        return NullOCRProvider()
    if settings.ocr_provider == "easyocr":
        try:
            from app.localization.ocr.easyocr_provider import EasyOCRProvider

            return EasyOCRProvider()
        except Exception:
            return MockOCRProvider()
    if settings.ocr_provider == "google_vision":
        if settings.google_application_credentials or settings.google_cloud_project:
            try:
                from app.localization.ocr.google_vision import GoogleVisionOCRProvider

                return GoogleVisionOCRProvider()
            except Exception:
                return MockOCRProvider()
        return MockOCRProvider()
    return MockOCRProvider()


__all__ = ["OCRProvider", "get_ocr_provider"]

