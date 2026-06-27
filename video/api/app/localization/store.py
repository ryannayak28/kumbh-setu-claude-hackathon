from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.job_store import job_dir
from app.localization.schemas import (
    EventHint,
    LocalizationResult,
    LocalizationStatus,
    Progress,
)
from app.utils.files import read_json, write_json


def create_localization_id() -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    return f"LOCJOB_{stamp}_{uuid.uuid4().hex[:8]}"


def localization_dir(job_id: str, localization_id: str) -> Path:
    return job_dir(job_id) / "localizations" / localization_id


def status_path(job_id: str, localization_id: str) -> Path:
    return localization_dir(job_id, localization_id) / "status.json"


def result_path(job_id: str, localization_id: str) -> Path:
    return localization_dir(job_id, localization_id) / "result.json"


def make_status_result(
    *,
    localization_id: str,
    job_id: str,
    candidate_id: str,
    status: LocalizationStatus,
    progress: Progress | None,
    event_hint: EventHint | None = None,
    error: dict[str, str] | None = None,
) -> LocalizationResult:
    return LocalizationResult(
        localization_id=localization_id,
        job_id=job_id,
        candidate_id=candidate_id,
        status=status,
        progress=progress,
        event_hint=event_hint,
        error=error,
    )


def write_localization_status(result: LocalizationResult) -> None:
    write_json(
        status_path(result.job_id, result.localization_id),
        result.model_dump(mode="json"),
    )


def write_localization_result(result: LocalizationResult) -> None:
    base = localization_dir(result.job_id, result.localization_id)
    write_json(base / "result.json", result.model_dump(mode="json"))
    write_json(base / "status.json", result.model_dump(mode="json"))


def read_localization(job_id: str, localization_id: str) -> LocalizationResult:
    data = read_json(result_path(job_id, localization_id))
    if data is None:
        data = read_json(status_path(job_id, localization_id))
    if data is None:
        raise FileNotFoundError(f"Localization {localization_id} was not found.")
    return LocalizationResult.model_validate(data)

