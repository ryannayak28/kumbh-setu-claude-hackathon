from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


JobStatusValue = Literal[
    "queued",
    "extracting",
    "sheeting",
    "scoring",
    "clipping",
    "done",
    "error",
]


class JobCounts(BaseModel):
    sampled_frames: int = 0
    person_crops: int = 0
    contact_sheets: int = 0
    scored_sheets: int = 0
    results: int = 0


class ProcessingSettings(BaseModel):
    sample_fps: float
    max_people_per_frame: int
    min_person_height: int
    yolo_conf: float


class JobStatus(BaseModel):
    job_id: str
    status: JobStatusValue
    stage: str
    progress: float = Field(ge=0, le=1)
    counts: JobCounts = Field(default_factory=JobCounts)
    error: str | None = None
    created_at: str
    updated_at: str


class JobRecord(JobStatus):
    target_description: str
    video_path: str
    reference_image_path: str | None = None
    processing_settings: ProcessingSettings


class JobCreateResponse(BaseModel):
    job_id: str
    status: str


class CropCandidate(BaseModel):
    crop_id: str
    crop_path: str
    frame_path: str
    timestamp_sec: float
    timestamp_label: str
    frame_idx: int
    bbox: list[float]
    det_conf: float
    area: float
    sharpness: float


class ContactSheet(BaseModel):
    sheet_id: str
    sheet_path: str
    crop_ids: list[str]


class VlmMatch(BaseModel):
    crop_id: str
    score: int = Field(ge=0, le=100)
    matched_attributes: list[str] = Field(default_factory=list)
    missing_or_unclear_attributes: list[str] = Field(default_factory=list)
    reason: str = ""


class SearchResult(BaseModel):
    rank: int
    crop_id: str
    score: int
    timestamp_sec: float
    timestamp_label: str
    thumbnail_url: str
    clip_url: str | None
    frame_url: str
    matched_attributes: list[str]
    missing_or_unclear_attributes: list[str]
    reason: str


class ResultsResponse(BaseModel):
    job_id: str
    target_description: str
    reference_image_url: str | None = None
    scoring_provider: str | None = None
    scoring_model: str | None = None
    results: list[SearchResult]
