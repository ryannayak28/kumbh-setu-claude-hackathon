from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


def assert_ffmpeg_available() -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is not available on PATH. Install ffmpeg to create result clips.")


def create_clip(
    *,
    video_path: str | Path,
    clip_path: str | Path,
    timestamp_sec: float,
    seconds_before: float,
    seconds_after: float,
) -> None:
    assert_ffmpeg_available()
    clip_target = Path(clip_path)
    clip_target.parent.mkdir(parents=True, exist_ok=True)

    start_sec = max(0.0, timestamp_sec - seconds_before)
    duration_sec = max(0.5, seconds_before + seconds_after)

    stream_copy_cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{start_sec:.3f}",
        "-i",
        str(video_path),
        "-t",
        f"{duration_sec:.3f}",
        "-c",
        "copy",
        str(clip_target),
    ]
    copy_result = subprocess.run(stream_copy_cmd, capture_output=True, text=True, check=False)
    if copy_result.returncode == 0 and clip_target.exists() and clip_target.stat().st_size > 0:
        return

    reencode_cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{start_sec:.3f}",
        "-i",
        str(video_path),
        "-t",
        f"{duration_sec:.3f}",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        str(clip_target),
    ]
    reencode_result = subprocess.run(reencode_cmd, capture_output=True, text=True, check=False)
    if reencode_result.returncode != 0 or not clip_target.exists() or clip_target.stat().st_size == 0:
        stderr = reencode_result.stderr or copy_result.stderr or "unknown ffmpeg error"
        raise RuntimeError(f"Clip generation failed for {clip_target.name}: {stderr.strip()}")

