from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import settings
from app.models import JobCounts, JobRecord
from app.utils.files import ensure_dir, read_json, write_json


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def job_dir(job_id: str) -> Path:
    return settings.output_root_path / job_id


def job_json_path(job_id: str) -> Path:
    return job_dir(job_id) / "job.json"


def prepare_job_dirs(job_id: str) -> Path:
    base = job_dir(job_id)
    for child in ["input", "frames", "crops", "sheets", "clips"]:
        ensure_dir(base / child)
    return base


def create_job_record(
    *,
    job_id: str,
    target_description: str,
    video_path: str,
    reference_image_path: str | None,
    processing_settings: dict[str, Any],
) -> JobRecord:
    now = utc_now()
    status = JobRecord(
        job_id=job_id,
        status="queued",
        stage="queued",
        progress=0,
        counts=JobCounts(),
        created_at=now,
        updated_at=now,
        target_description=target_description,
        video_path=video_path,
        reference_image_path=reference_image_path,
        processing_settings=processing_settings,
    )
    write_json(job_json_path(job_id), status.model_dump())
    return status


def get_job(job_id: str) -> JobRecord:
    data = read_json(job_json_path(job_id))
    if data is None:
        raise FileNotFoundError(f"Job {job_id} was not found.")
    return JobRecord.model_validate(data)


def update_job(job_id: str, **updates: Any) -> JobRecord:
    current = get_job(job_id)
    data = current.model_dump()
    counts_update = updates.pop("counts", None)
    if counts_update is not None:
        counts = data.get("counts", {})
        counts.update(counts_update)
        data["counts"] = counts
    data.update(updates)
    data["updated_at"] = utc_now()
    updated = JobRecord.model_validate(data)
    write_json(job_json_path(job_id), updated.model_dump())
    return updated
