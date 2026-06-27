from __future__ import annotations

from abc import ABC, abstractmethod

from app.localization.schemas import EvidenceFrame, OCRBlock


class OCRProvider(ABC):
    name: str

    @abstractmethod
    def extract_text(self, frames: list[EvidenceFrame]) -> list[OCRBlock]:
        raise NotImplementedError


class NullOCRProvider(OCRProvider):
    name = "none"

    def extract_text(self, frames: list[EvidenceFrame]) -> list[OCRBlock]:
        return []

