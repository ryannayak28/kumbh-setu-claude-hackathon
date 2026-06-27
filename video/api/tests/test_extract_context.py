from pathlib import Path

import pytest

from app.localization.extract_context import extract_context_frames


cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")


def test_extract_context_handles_short_video_edges(tmp_path: Path) -> None:
    video_path = tmp_path / "video.mp4"
    writer = cv2.VideoWriter(
        str(video_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        10.0,
        (64, 48),
    )
    for index in range(20):
        frame = np.full((48, 64, 3), index * 10, dtype=np.uint8)
        writer.write(frame)
    writer.release()

    job_dir = tmp_path / "JOB_TEST"
    frames = extract_context_frames(
        job_id="JOB_TEST",
        job_dir_path=job_dir,
        video_path=video_path,
        center_ts=0.2,
        before_sec=5,
        after_sec=1,
        sample_fps=2.0,
        output_dir=job_dir / "localizations" / "LOCJOB_TEST" / "context",
        max_frames=10,
    )

    assert len(frames) >= 2
    assert frames[0].timestamp_sec == 0
    assert frames[0].image_url.startswith("/static/JOB_TEST/localizations/LOCJOB_TEST/context/")
    assert Path(frames[0].image_path).exists()

