from __future__ import annotations

from abc import ABC, abstractmethod

from pydantic import BaseModel, Field

from app.localization.schemas import EventHint, EvidenceFrame, LocationClue, OCRBlock, SearchQuery


class VLMClueResult(BaseModel):
    clues: list[LocationClue] = Field(default_factory=list)
    suggested_queries: list[SearchQuery] = Field(default_factory=list)
    frame_summaries: dict[str, str] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class VLMClueProvider(ABC):
    name: str

    @abstractmethod
    def extract_location_clues(
        self,
        *,
        frames: list[EvidenceFrame],
        ocr_blocks: list[OCRBlock],
        event_hint: EventHint,
    ) -> VLMClueResult:
        raise NotImplementedError

