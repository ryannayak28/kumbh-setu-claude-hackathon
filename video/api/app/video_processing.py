from __future__ import annotations

from pathlib import Path
from typing import Any

from app.config import settings
from app.contact_sheet import make_contact_sheets
from app.job_store import get_job, job_dir, update_job
from app.models import ContactSheet, CropCandidate, SearchResult, VlmMatch
from app.utils.clips import create_clip
from app.utils.files import read_json, static_url, write_json
from app.utils.time import format_timestamp
from app.vlm import get_scorer


def process_job(job_id: str) -> None:
    try:
        job = get_job(job_id)
        base = job_dir(job_id)
        processing = job.processing_settings

        update_job(job_id, status="extracting", stage="extracting person crops", progress=0.05, error=None)
        candidates = extract_person_crops(
            job_id=job_id,
            video_path=job.video_path,
            job_dir_path=base,
            sample_fps=processing.sample_fps,
            max_people_per_frame=processing.max_people_per_frame,
            min_person_height=processing.min_person_height,
            yolo_conf=processing.yolo_conf,
        )
        write_json(base / "candidates.json", [candidate.model_dump() for candidate in candidates])

        update_job(
            job_id,
            status="sheeting",
            stage="building contact sheets",
            progress=0.35,
            counts={"person_crops": len(candidates)},
        )
        sheets = make_contact_sheets(
            candidates=candidates,
            job_dir=base,
            sheet_size=settings.contact_sheet_size,
        )
        update_job(job_id, counts={"contact_sheets": len(sheets)})

        update_job(
            job_id,
            status="scoring",
            stage="scoring contact sheets with vision model",
            progress=0.45,
        )
        matches = score_sheets(
            job_id=job_id,
            sheets=sheets,
            target_description=job.target_description,
            reference_image_path=job.reference_image_path,
        )
        write_json(base / "scores.json", [match.model_dump() for match in matches])

        update_job(job_id, status="clipping", stage="creating result clips", progress=0.85)
        results = build_results(
            job_id=job_id,
            candidates=candidates,
            matches=matches,
            job_dir_path=base,
        )
        create_result_clips(
            results=results,
            video_path=job.video_path,
            job_dir_path=base,
        )
        write_json(base / "results.json", [result.model_dump() for result in results])

        update_job(
            job_id,
            status="done",
            stage="done",
            progress=1.0,
            counts={"results": len(results)},
            error=None,
        )
    except Exception as exc:
        update_job(
            job_id,
            status="error",
            stage="error",
            progress=1.0,
            error=str(exc),
        )


def extract_person_crops(
    *,
    job_id: str,
    video_path: str,
    job_dir_path: str | Path,
    sample_fps: float,
    max_people_per_frame: int,
    min_person_height: int,
    yolo_conf: float,
) -> list[CropCandidate]:
    try:
        import cv2
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("OpenCV and ultralytics are required. Run pip install -r requirements.txt.") from exc

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video file: {Path(video_path).name}")

    video_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
    if video_fps <= 0:
        video_fps = 25.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frame_interval = max(1, int(video_fps / max(sample_fps, 0.1)))

    try:
        model = YOLO(settings.default_yolo_model)
    except Exception as exc:
        raise RuntimeError(f"YOLO model load failure for {settings.default_yolo_model}: {exc}") from exc

    base = Path(job_dir_path)
    frames_dir = base / "frames"
    crops_dir = base / "crops"
    candidates: list[CropCandidate] = []
    sampled_frames = 0
    crop_counter = 1
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_idx % frame_interval != 0:
            frame_idx += 1
            continue

        sampled_frames += 1
        timestamp_sec = frame_idx / video_fps
        result = model(frame, classes=[0], conf=yolo_conf, verbose=False)[0]
        detections = _person_detections(result)
        detections = [
            det for det in detections if (det["bbox"][3] - det["bbox"][1]) >= min_person_height
        ]
        detections = sorted(detections, key=lambda det: det["area"], reverse=True)[
            :max_people_per_frame
        ]

        if detections:
            frame_name = f"frame_{int(timestamp_sec):06d}_{frame_idx:08d}.jpg"
            frame_path = frames_dir / frame_name
            cv2.imwrite(str(frame_path), frame)

            for det in detections:
                crop_id = f"CROP_{crop_counter:06d}"
                crop_counter += 1
                crop = _crop_with_padding(frame, det["bbox"], pad_ratio=0.08)
                crop_path = crops_dir / f"{crop_id}.jpg"
                cv2.imwrite(str(crop_path), crop)
                candidates.append(
                    CropCandidate(
                        crop_id=crop_id,
                        crop_path=str(crop_path),
                        frame_path=str(frame_path),
                        timestamp_sec=timestamp_sec,
                        timestamp_label=format_timestamp(timestamp_sec),
                        frame_idx=frame_idx,
                        bbox=[float(v) for v in det["bbox"]],
                        det_conf=float(det["conf"]),
                        area=float(det["area"]),
                        sharpness=blur_score(crop),
                    )
                )

        if sampled_frames % 10 == 0:
            progress = 0.05
            if frame_count > 0:
                progress = min(0.33, 0.05 + 0.28 * (frame_idx / frame_count))
            update_job(
                job_id,
                progress=progress,
                counts={
                    "sampled_frames": sampled_frames,
                    "person_crops": len(candidates),
                },
            )

        frame_idx += 1

    cap.release()
    update_job(
        job_id,
        progress=0.34,
        counts={"sampled_frames": sampled_frames, "person_crops": len(candidates)},
    )

    if not candidates:
        raise RuntimeError(
            "No people were detected. Try lowering min_person_height or YOLO confidence."
        )
    return candidates


def _person_detections(result: Any) -> list[dict[str, Any]]:
    detections: list[dict[str, Any]] = []
    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return detections

    for box in boxes:
        xyxy = box.xyxy[0].tolist()
        conf = float(box.conf[0]) if box.conf is not None else 0.0
        x1, y1, x2, y2 = [float(value) for value in xyxy]
        area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        detections.append({"bbox": [x1, y1, x2, y2], "conf": conf, "area": area})
    return detections


def _crop_with_padding(frame: Any, bbox: list[float], pad_ratio: float) -> Any:
    height, width = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    pad_x = (x2 - x1) * pad_ratio
    pad_y = (y2 - y1) * pad_ratio
    left = max(0, int(x1 - pad_x))
    top = max(0, int(y1 - pad_y))
    right = min(width, int(x2 + pad_x))
    bottom = min(height, int(y2 + pad_y))
    return frame[top:bottom, left:right]


def blur_score(bgr_img: Any) -> float:
    import cv2

    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def score_sheets(
    *,
    job_id: str,
    sheets: list[ContactSheet],
    target_description: str,
    reference_image_path: str | None,
) -> list[VlmMatch]:
    scorer = get_scorer()
    matches: list[VlmMatch] = []
    failures = 0
    failed_sheet_ids: list[str] = []

    for index, sheet in enumerate(sheets, start=1):
        try:
            sheet_matches = scorer.score_sheet(
                sheet_path=sheet.sheet_path,
                target_description=target_description,
                reference_image_path=reference_image_path,
                crop_ids=sheet.crop_ids,
            )
            matches.extend(sheet_matches)
        except Exception as exc:
            failures += 1
            failed_sheet_ids.append(sheet.sheet_id)
            _append_sheet_error(job_id, sheet.sheet_id, str(exc))

        update_job(
            job_id,
            progress=0.45 + 0.35 * (index / max(1, len(sheets))),
            counts={"scored_sheets": index - failures},
        )

    if sheets and failures == len(sheets):
        raise RuntimeError("All VLM scoring calls failed. Check provider settings and API responses.")
    write_json(
        job_dir(job_id) / "scores_meta.json",
        {
            "provider": settings.vlm_provider,
            "model": scoring_model_name(),
            "sheet_count": len(sheets),
            "successful_sheets": len(sheets) - failures,
            "failed_sheets": failures,
            "failed_sheet_ids": failed_sheet_ids,
        },
    )
    return matches


def scoring_model_name() -> str:
    if settings.vlm_provider == "claude":
        return settings.anthropic_model
    return "mock"


def _append_sheet_error(job_id: str, sheet_id: str, message: str) -> None:
    path = job_dir(job_id) / "sheet_errors.json"
    errors = read_json(path, default=[])
    errors.append({"sheet_id": sheet_id, "error": message})
    write_json(path, errors)


def build_results(
    *,
    job_id: str,
    candidates: list[CropCandidate],
    matches: list[VlmMatch],
    job_dir_path: str | Path,
) -> list[SearchResult]:
    candidates_by_id = {candidate.crop_id: candidate for candidate in candidates}
    best_match_by_crop: dict[str, VlmMatch] = {}
    for match in matches:
        current = best_match_by_crop.get(match.crop_id)
        if current is None or match.score > current.score:
            best_match_by_crop[match.crop_id] = match

    sorted_matches = sorted(best_match_by_crop.values(), key=lambda match: match.score, reverse=True)
    kept: list[VlmMatch] = []
    for match in sorted_matches:
        candidate = candidates_by_id.get(match.crop_id)
        if candidate is None:
            continue
        if any(
            abs(candidate.timestamp_sec - candidates_by_id[other.crop_id].timestamp_sec)
            <= settings.dedup_window_seconds
            for other in kept
            if other.crop_id in candidates_by_id
        ):
            continue
        kept.append(match)
        if len(kept) >= settings.top_results:
            break

    base = Path(job_dir_path)
    results: list[SearchResult] = []
    for rank, match in enumerate(kept, start=1):
        candidate = candidates_by_id[match.crop_id]
        clip_path = base / "clips" / f"{match.crop_id}.mp4"
        results.append(
            SearchResult(
                rank=rank,
                crop_id=match.crop_id,
                score=match.score,
                timestamp_sec=candidate.timestamp_sec,
                timestamp_label=candidate.timestamp_label,
                thumbnail_url=static_url(job_id, candidate.crop_path, base),
                clip_url=static_url(job_id, clip_path, base),
                frame_url=static_url(job_id, candidate.frame_path, base),
                matched_attributes=match.matched_attributes,
                missing_or_unclear_attributes=match.missing_or_unclear_attributes,
                reason=match.reason,
            )
        )
    return results


def create_result_clips(
    *,
    results: list[SearchResult],
    video_path: str,
    job_dir_path: str | Path,
) -> None:
    base = Path(job_dir_path)
    for result in results:
        clip_path = base / "clips" / f"{result.crop_id}.mp4"
        create_clip(
            video_path=video_path,
            clip_path=clip_path,
            timestamp_sec=result.timestamp_sec,
            seconds_before=settings.clip_seconds_before,
            seconds_after=settings.clip_seconds_after,
        )
