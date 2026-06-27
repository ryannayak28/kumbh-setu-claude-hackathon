from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def ensure_dir(path: str | Path) -> Path:
    target = Path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target


def read_json(path: str | Path, default: Any | None = None) -> Any:
    json_path = Path(path)
    if not json_path.exists():
        return default
    with json_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: str | Path, data: Any) -> None:
    json_path = Path(path)
    ensure_dir(json_path.parent)
    tmp_path = json_path.with_suffix(json_path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
    tmp_path.replace(json_path)


def static_url(job_id: str, absolute_path: str | Path, job_dir: str | Path) -> str:
    rel = Path(absolute_path).resolve().relative_to(Path(job_dir).resolve())
    return f"/static/{job_id}/{rel.as_posix()}"

