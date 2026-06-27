"""Setu data model — see PLAN.md §4. Pydantic mirrors of the shared TS types."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

AgeBand = Literal["0-12", "13-17", "18-40", "41-60", "61-70", "71-80", "80+"]
Status = Literal[
    "Reported", "Pending", "Matched", "Reunited", "Transferred", "Unresolved"
]
Channel = Literal["whatsapp", "web", "operator", "kiosk"]
Gender = Literal["Male", "Female", "Unknown"]


class PII(BaseModel):
    """Sensitive fields — stored separately, masked by default, purged on close."""

    name: Optional[str] = None
    mobile: Optional[str] = None
    photoUrl: Optional[str] = None
    physicalDescription: Optional[str] = None
    consent: bool = True
    purgedAt: Optional[str] = None


class GeoResolution(BaseModel):
    zone: str
    zoneCentroid: Optional[list[float]] = None  # [lat, lng] for map fly-to
    lastSeenLatLng: Optional[list[float]] = None
    nearestCctv: list[str] = Field(default_factory=list)
    nearestStation: str = ""
    nearbyChokepoints: list[str] = Field(default_factory=list)


class Case(BaseModel):
    id: str
    reportedAt: str
    channel: Channel
    gender: Gender
    ageBand: AgeBand
    state: Optional[str] = None
    district: Optional[str] = None
    language: Optional[str] = None
    lastSeenLocation: str
    reportingCenter: str
    status: Status
    geo: GeoResolution
    pii: PII
    linkedFoundId: Optional[str] = None
    resolutionHours: Optional[float] = None
    remarks: Optional[str] = None


class FoundPerson(BaseModel):
    """Synthesized: the dataset has no found-side records (CONTEXT §4 quirk 1)."""

    id: str
    foundAt: str
    center: str
    gender: Gender
    ageBand: AgeBand
    language: Optional[str] = None
    observedLocation: str
    note: Optional[str] = None
    matchedCaseId: Optional[str] = None
    # Coarse descriptors a volunteer at a found-desk would actually log.
    approxName: Optional[str] = None


class CctvPoint(BaseModel):
    id: str
    lat: float
    lng: float
    zone: str = ""


class StationPoint(BaseModel):
    name: str
    lat: float
    lng: float


class Chokepoint(BaseModel):
    name: str
    category: str
    lat: float
    lng: float
    risk: Optional[str] = None


class ZonePoly(BaseModel):
    name: str
    lat: float
    lng: float
    polygon: list[list[float]] = Field(default_factory=list)  # [[lat,lng],...]


class Geo(BaseModel):
    cctv: list[CctvPoint] = Field(default_factory=list)
    stations: list[StationPoint] = Field(default_factory=list)
    chokepoints: list[Chokepoint] = Field(default_factory=list)
    zones: list[ZonePoly] = Field(default_factory=list)


class MatchCandidate(BaseModel):
    foundId: str
    score: float  # 0..1
    rationale: str
    fieldsMatched: list[str] = Field(default_factory=list)
    tier: Literal["auto", "review"]
    # Snapshot of the found record so the UI can render a card without a join.
    found: Optional[FoundPerson] = None


# --- request/response bodies --------------------------------------------


class IntakeRequest(BaseModel):
    """Free-text-first intake. Most fields optional — Claude/heuristics fill gaps."""

    rawText: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Free-text report in any language or transliteration.",
    )
    channel: Channel = "web"
    name: Optional[str] = None
    mobile: Optional[str] = None
    gender: Optional[Gender] = None
    ageBand: Optional[AgeBand] = None
    language: Optional[str] = None
    lastSeenLocation: Optional[str] = None
    reportingCenter: Optional[str] = None
    consent: bool = False

    @field_validator("rawText", "name", "mobile", "language", "lastSeenLocation", "reportingCenter")
    @classmethod
    def _strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class IntakeResponse(BaseModel):
    case: Case
    candidates: list[MatchCandidate]
    extractedBy: Literal["claude", "heuristic"]
    trackUrl: str
