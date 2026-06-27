from __future__ import annotations

from pathlib import Path
from typing import Any

from app.localization.schemas import EvidenceFrame
from app.utils.files import static_url
from app.utils.time import format_timestamp


def sharpness_score(frame_bgr: Any) -> float:
    import cv2

    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def extract_context_frames(
    *,
    job_id: str,
    job_dir_path: str | Path,
    video_path: str | Path,
    center_ts: float,
    before_sec: int,
    after_sec: int,
    sample_fps: float,
    output_dir: str | Path,
    max_frames: int | None = None,
) -> list[EvidenceFrame]:
    try:
        import cv2
    except ImportError as exc:
        raise RuntimeError("OpenCV is required for context frame extraction.") from exc

    video = Path(video_path)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video}")

    video_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / video_fps if total_frames else 0.0
    start_ts = max(0.0, center_ts - before_sec)
    end_ts = center_ts + after_sec
    if duration > 0:
        end_ts = min(duration, end_ts)

    step = 1.0 / max(sample_fps, 0.1)
    frames: list[EvidenceFrame] = []
    frame_number = 1
    ts = start_ts

    while ts <= end_ts + 0.001:
        if max_frames is not None and len(frames) >= max_frames:
            break

        cap.set(cv2.CAP_PROP_POS_MSEC, ts * 1000.0)
        ok, frame = cap.read()
        if not ok:
            ts += step
            continue

        frame_id = f"FRAME_{frame_number:06d}"
        frame_path = output / f"{frame_id}.jpg"
        cv2.imwrite(str(frame_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])

        frames.append(
            EvidenceFrame(
                frame_id=frame_id,
                timestamp_sec=round(ts, 2),
                timestamp_mmss=format_timestamp(ts),
                image_path=str(frame_path),
                image_url=static_url(job_id, frame_path, job_dir_path),
                sharpness=round(sharpness_score(frame), 3),
            )
        )

        frame_number += 1
        ts += step

    cap.release()
    return frames

