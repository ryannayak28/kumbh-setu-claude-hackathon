from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class LatLng(BaseModel):
    lat: float
    lng: float


class EventHint(BaseModel):
    event_name: str | None = None
    city: str | None = None
    country: str | None = None
    approx_center: LatLng | None = None
    search_radius_m: int = Field(default=15000, ge=100, le=100000)
    extra_keywords: list[str] = Field(default_factory=list)


class LocalizeRequest(BaseModel):
    window_before_sec: int = Field(default=60, ge=5, le=600)
    window_after_sec: int = Field(default=60, ge=5, le=600)
    sample_fps: float = Field(default=1.0, ge=0.1, le=5.0)
    event_hint: EventHint = Field(default_factory=EventHint)


class LocalizeStartResponse(BaseModel):
    localization_id: str
    job_id: str
    candidate_id: str
    status: str
    status_url: str


class LocalizationStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class Progress(BaseModel):
    stage: str
    message: str
    percent: int = Field(ge=0, le=100)


class EvidenceFrame(BaseModel):
    frame_id: str
    timestamp_sec: float
    timestamp_mmss: str
    image_path: str
    image_url: str
    selected_for_vlm: bool = False
    ocr_text: list[str] = Field(default_factory=list)
    visual_summary: str | None = None
    sharpness: float | None = None


class OCRBlock(BaseModel):
    frame_id: str
    text: str
    confidence: float | None = None
    bbox: list[float] | None = None


class LocationClue(BaseModel):
    clue_id: str
    type: Literal[
        "text_sign",
        "landmark",
        "route_marker",
        "shop",
        "event_structure",
        "natural_feature",
        "road_layout",
        "other",
    ]
    value: str
    normalized_value: str
    confidence: float = Field(ge=0, le=1)
    frame_ids: list[str] = Field(default_factory=list)
    timestamp_mmss: str | None = None
    why_it_matters: str | None = None


class SearchQuery(BaseModel):
    query_id: str
    query: str
    source_clue_ids: list[str] = Field(default_factory=list)


class SourceResult(BaseModel):
    source: str
    name: str
    address: str | None = None
    lat: float
    lng: float
    raw_score: float | None = None
    url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CandidateLocation(BaseModel):
    candidate_location_id: str
    name: str
    lat: float
    lng: float
    confidence: float = Field(ge=0, le=1)
    confidence_label: Literal["likely", "possible", "weak"]
    radius_m: int
    zone_id: str | None = None
    zone_name: str | None = None
    zone_relation_score: float = Field(default=0.0, ge=0, le=1)
    within_allowed_zone: bool = False
    matched_clues: list[str] = Field(default_factory=list)
    evidence_frame_ids: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    source_results: list[SourceResult] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    map_url: str | None = None


class LocalizationResult(BaseModel):
    localization_id: str
    job_id: str
    candidate_id: str
    status: LocalizationStatus
    progress: Progress | None = None
    sighting: dict[str, Any] | None = None
    event_hint: EventHint | None = None
    evidence_frames: list[EvidenceFrame] = Field(default_factory=list)
    extracted_clues: list[LocationClue] = Field(default_factory=list)
    search_queries: list[SearchQuery] = Field(default_factory=list)
    candidate_locations: list[CandidateLocation] = Field(default_factory=list)
    debug: dict[str, Any] = Field(default_factory=dict)
    error: dict[str, str] | None = None
