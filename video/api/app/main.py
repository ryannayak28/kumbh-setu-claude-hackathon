from __future__ import annotations

import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv(override=True)

from app.config import settings  # noqa: E402
from app.job_store import create_job_record, get_job, job_dir, prepare_job_dirs  # noqa: E402
from app.localization.schemas import (  # noqa: E402
    LocalizeRequest,
    LocalizeStartResponse,
    LocalizationResult,
)
from app.localization.service import (  # noqa: E402
    LocalizationError,
    create_localization_job,
    get_localization_result,
    run_localization_job,
)
from app.models import JobCreateResponse, JobStatus, ResultsResponse  # noqa: E402
from app.utils.files import read_json, static_url  # noqa: E402
from app.video_processing import process_job  # noqa: E402


app = FastAPI(title="Lost Person POV Search API")

settings.output_root_path.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(settings.output_root_path)), name="static")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "ok": "true",
        "vlm_provider": settings.vlm_provider,
        "vlm_model": settings.anthropic_model if settings.vlm_provider == "claude" else "mock",
        "vlm_configured": "true"
        if settings.vlm_provider == "mock" or bool(settings.anthropic_api_key)
        else "false",
        "localization_enabled": "true" if settings.localization_enabled else "false",
    }


@app.post("/api/jobs", response_model=JobCreateResponse)
async def create_job(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    reference_image: UploadFile | None = File(default=None),
    target_description: str = Form(...),
    sample_fps: float = Form(default=settings.default_sample_fps),
    max_people_per_frame: int = Form(default=settings.default_max_people_per_frame),
    min_person_height: int = Form(default=settings.default_min_person_height),
    yolo_conf: float = Form(default=settings.default_yolo_conf),
) -> JobCreateResponse:
    description = target_description.strip()
    if len(description) < 10:
        raise HTTPException(status_code=400, detail="Target appearance must be at least 10 characters.")

    video_ext = _validate_upload_extension(
        upload=video,
        allowed=settings.allowed_video_extensions,
        label="video",
    )
    ref_ext: str | None = None
    if reference_image and reference_image.filename:
        ref_ext = _validate_upload_extension(
            upload=reference_image,
            allowed=settings.allowed_image_extensions,
            label="reference image",
        )

    job_id = str(uuid.uuid4())
    base = prepare_job_dirs(job_id)
    video_path = base / "input" / f"video{video_ext}"
    await _save_upload(video, video_path)

    reference_path: Path | None = None
    if reference_image and ref_ext:
        reference_path = base / "input" / f"reference{ref_ext}"
        await _save_upload(reference_image, reference_path)

    create_job_record(
        job_id=job_id,
        target_description=description,
        video_path=str(video_path),
        reference_image_path=str(reference_path) if reference_path else None,
        processing_settings={
            "sample_fps": sample_fps,
            "max_people_per_frame": max_people_per_frame,
            "min_person_height": min_person_height,
            "yolo_conf": yolo_conf,
        },
    )
    background_tasks.add_task(process_job, job_id)
    return JobCreateResponse(job_id=job_id, status="queued")


@app.get("/api/jobs/{job_id}", response_model=JobStatus)
def read_job(job_id: str) -> JobStatus:
    try:
        return get_job(job_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/jobs/{job_id}/results", response_model=ResultsResponse)
def read_results(job_id: str) -> ResultsResponse:
    try:
        job = get_job(job_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if job.status == "error":
        raise HTTPException(status_code=400, detail=job.error or "Job failed.")
    if job.status != "done":
        raise HTTPException(status_code=409, detail="Job is not done yet.")

    base = job_dir(job_id)
    results = read_json(base / "results.json", default=[])
    scores_meta = read_json(base / "scores_meta.json", default={})
    reference_image_url = (
        static_url(job_id, job.reference_image_path, base) if job.reference_image_path else None
    )
    return ResultsResponse(
        job_id=job_id,
        target_description=job.target_description,
        reference_image_url=reference_image_url,
        scoring_provider=scores_meta.get("provider"),
        scoring_model=scores_meta.get("model"),
        results=results,
    )


@app.post(
    "/api/jobs/{job_id}/candidates/{candidate_id}/localize",
    response_model=LocalizeStartResponse,
)
def start_localization(
    job_id: str,
    candidate_id: str,
    request: LocalizeRequest,
    background_tasks: BackgroundTasks,
) -> LocalizeStartResponse:
    try:
        started = create_localization_job(
            job_id=job_id,
            candidate_id=candidate_id,
            request=request,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except LocalizationError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    background_tasks.add_task(
        run_localization_job,
        job_id=job_id,
        candidate_id=candidate_id,
        localization_id=started.localization_id,
        request=request,
    )
    return started


@app.get("/api/jobs/{job_id}/localizations/{localization_id}", response_model=LocalizationResult)
def read_localization(job_id: str, localization_id: str) -> LocalizationResult:
    try:
        return get_localization_result(job_id, localization_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _validate_upload_extension(upload: UploadFile, allowed: set[str], label: str) -> str:
    filename = upload.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in allowed:
        allowed_list = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported {label} extension. Allowed extensions: {allowed_list}.",
        )
    return suffix


async def _save_upload(upload: UploadFile, path: Path) -> None:
    max_bytes = settings.upload_max_mb * 1024 * 1024
    written = 0
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("wb") as handle:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload exceeds {settings.upload_max_mb} MB limit.",
                    )
                handle.write(chunk)
    except Exception:
        if path.exists():
            path.unlink()
        raise
    finally:
        await upload.close()

    if path.stat().st_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
