from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from app.config import settings
from app.job_store import get_job, job_dir
from app.localization.extract_context import extract_context_frames
from app.localization.frame_selection import select_context_frames_for_vlm
from app.localization.nashik_gazetteer import (
    alias_match_debug,
    allowed_zone_ids,
    filter_results_to_allowed_zones,
)
from app.localization.ocr import get_ocr_provider
from app.localization.ranker import rank_candidate_locations
from app.localization.schemas import (
    EventHint,
    EvidenceFrame,
    LocalizeRequest,
    LocalizeStartResponse,
    LocalizationResult,
    LocalizationStatus,
    Progress,
    SourceResult,
)
from app.localization.search.google_places import GooglePlacesSearch
from app.localization.search.nominatim import NominatimSearch
from app.localization.search.overpass import OverpassSearch
from app.localization.search.web_grounding import WebGroundingSearch
from app.localization.store import (
    create_localization_id,
    localization_dir,
    make_status_result,
    read_localization,
    write_localization_result,
    write_localization_status,
)
from app.localization.utils import (
    generate_location_queries,
    merge_event_hint,
    normalize_clues,
)
from app.localization.vlm_clues import get_vlm_clue_provider
from app.utils.files import read_json
from app.utils.time import format_timestamp


ProgressUpdater = Callable[[str, str, int], None]


class LocalizationError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def create_localization_job(
    *,
    job_id: str,
    candidate_id: str,
    request: LocalizeRequest,
) -> LocalizeStartResponse:
    if not settings.localization_enabled:
        raise LocalizationError("LOCALIZATION_DISABLED", "Location Breadcrumbs is disabled.")
    get_job(job_id)
    _find_candidate_sighting(job_id, candidate_id)

    localization_id = create_localization_id()
    enriched_hint = merge_event_hint(request.event_hint)
    initial = make_status_result(
        localization_id=localization_id,
        job_id=job_id,
        candidate_id=candidate_id,
        status=LocalizationStatus.queued,
        progress=Progress(stage="queued", message="Localization queued", percent=0),
        event_hint=enriched_hint,
    )
    write_localization_status(initial)
    return LocalizeStartResponse(
        localization_id=localization_id,
        job_id=job_id,
        candidate_id=candidate_id,
        status="queued",
        status_url=f"/api/jobs/{job_id}/localizations/{localization_id}",
    )


def run_localization_job(
    *,
    job_id: str,
    candidate_id: str,
    localization_id: str,
    request: LocalizeRequest,
) -> None:
    event_hint = merge_event_hint(request.event_hint)

    def update_progress(stage: str, message: str, percent: int) -> None:
        write_localization_status(
            make_status_result(
                localization_id=localization_id,
                job_id=job_id,
                candidate_id=candidate_id,
                status=LocalizationStatus.running,
                progress=Progress(stage=stage, message=message, percent=percent),
                event_hint=event_hint,
            )
        )

    try:
        result = run_localization_pipeline(
            job_id=job_id,
            candidate_id=candidate_id,
            localization_id=localization_id,
            request=request,
            event_hint=event_hint,
            update_progress=update_progress,
        )
        write_localization_result(result)
    except LocalizationError as exc:
        _write_failed(job_id, candidate_id, localization_id, event_hint, exc.code, exc.message)
    except Exception as exc:
        _write_failed(
            job_id,
            candidate_id,
            localization_id,
            event_hint,
            "LOCALIZATION_FAILED",
            str(exc),
        )


def get_localization_result(job_id: str, localization_id: str) -> LocalizationResult:
    get_job(job_id)
    return read_localization(job_id, localization_id)


def run_localization_pipeline(
    *,
    job_id: str,
    candidate_id: str,
    localization_id: str,
    request: LocalizeRequest,
    event_hint: EventHint,
    update_progress: ProgressUpdater,
) -> LocalizationResult:
    job = get_job(job_id)
    base = job_dir(job_id)
    sighting = _find_candidate_sighting(job_id, candidate_id)
    timestamp_sec = float(sighting["timestamp_sec"])
    output_dir = localization_dir(job_id, localization_id)
    warnings: list[str] = []

    update_progress("extract_frames", "Extracting context frames", 10)
    frames = extract_context_frames(
        job_id=job_id,
        job_dir_path=base,
        video_path=Path(job.video_path),
        center_ts=timestamp_sec,
        before_sec=request.window_before_sec,
        after_sec=request.window_after_sec,
        sample_fps=request.sample_fps,
        output_dir=output_dir / "context",
        max_frames=settings.localization_max_context_frames,
    )
    if not frames:
        raise LocalizationError(
            "NO_CONTEXT_FRAMES",
            "Could not extract context frames around candidate timestamp.",
        )

    update_progress("ocr", f"Running OCR on {len(frames)} context frames", 30)
    ocr_provider = get_ocr_provider()
    ocr_blocks = ocr_provider.extract_text(frames)

    update_progress("frame_selection", "Selecting high-signal context frames", 45)
    selected_frames = select_context_frames_for_vlm(
        frames=frames,
        ocr_blocks=ocr_blocks,
        max_frames=settings.localization_top_frames_for_vlm,
        center_ts=timestamp_sec,
    )

    update_progress("vlm_clues", "Extracting visual location clues", 60)
    clue_provider = get_vlm_clue_provider()
    clue_result = clue_provider.extract_location_clues(
        frames=selected_frames,
        ocr_blocks=ocr_blocks,
        event_hint=event_hint,
    )
    clues = normalize_clues(clue_result.clues)
    _apply_frame_summaries(frames, clue_result.frame_summaries)
    warnings.extend(clue_result.warnings)

    update_progress("query_generation", "Generating map search queries", 70)
    generated = generate_location_queries(
        clues=clues,
        event_hint=event_hint,
        max_queries=8,
    )
    queries = generated

    update_progress("place_search", "Searching map and geocoding sources", 82)
    search_cache = output_dir / "search_cache"
    search_cache.mkdir(parents=True, exist_ok=True)
    source_results, search_warnings = _search_locations(queries, clues, event_hint, search_cache)
    warnings.extend(search_warnings)
    source_results, discarded_out_of_zone_count = filter_results_to_allowed_zones(source_results)
    if discarded_out_of_zone_count:
        warnings.append(
            f"Discarded {discarded_out_of_zone_count} map results outside allowed Nashik zones."
        )
    if not source_results:
        warnings.append("No external map source landed inside the allowed Nashik zones.")

    update_progress("ranking", "Ranking candidate locations", 94)
    candidate_locations = rank_candidate_locations(
        source_results=source_results,
        clues=clues,
        evidence_frames=frames,
        event_hint=event_hint,
        top_k=settings.localization_top_location_results,
    )

    update_progress("completed", "Localization completed", 100)
    return LocalizationResult(
        localization_id=localization_id,
        job_id=job_id,
        candidate_id=candidate_id,
        status=LocalizationStatus.completed,
        progress=Progress(stage="completed", message="Localization completed", percent=100),
        sighting={
            "timestamp_sec": timestamp_sec,
            "timestamp_mmss": sighting.get("timestamp_mmss") or format_timestamp(timestamp_sec),
            "clip_url": sighting.get("clip_url"),
            "frame_url": sighting.get("frame_url"),
            "thumbnail_url": sighting.get("thumbnail_url"),
        },
        event_hint=event_hint,
        evidence_frames=frames,
        extracted_clues=clues,
        search_queries=queries,
        candidate_locations=candidate_locations,
        debug={
            "providers_used": {
                "ocr": ocr_provider.name,
                "vlm_clues": clue_provider.name,
                "places": sorted({result.source for result in source_results} | {"nashik_zone"}),
            },
            "allowed_zone_ids": allowed_zone_ids(),
            "discarded_out_of_zone_count": discarded_out_of_zone_count,
            "zone_alias_matches": alias_match_debug(clues),
            "warnings": warnings,
        },
    )


def _search_locations(
    queries: list,
    clues: list,
    event_hint: EventHint,
    cache_dir: Path,
) -> tuple[list[SourceResult], list[str]]:
    warnings: list[str] = []
    source_results: list[SourceResult] = []
    providers = [
        GooglePlacesSearch.from_settings(),
        NominatimSearch.from_settings(),
        WebGroundingSearch.from_settings(),
    ]
    for provider in providers:
        try:
            source_results.extend(provider.search_many(queries, event_hint, cache_dir=cache_dir))
        except Exception as exc:
            warnings.append(f"{provider.name} search failed: {exc}")
    try:
        source_results.extend(
            OverpassSearch.from_settings().search_by_clues(clues, event_hint, cache_dir=cache_dir)
        )
    except Exception as exc:
        warnings.append(f"overpass search failed: {exc}")
    return source_results, warnings


def _find_candidate_sighting(job_id: str, candidate_id: str) -> dict[str, Any]:
    base = job_dir(job_id)
    results = read_json(base / "results.json", default=[]) or []
    for item in results:
        if item.get("crop_id") == candidate_id or item.get("candidate_id") == candidate_id:
            timestamp = item.get("timestamp_sec")
            if timestamp is None:
                break
            return {
                "candidate_id": candidate_id,
                "timestamp_sec": float(timestamp),
                "timestamp_mmss": item.get("timestamp_label") or item.get("timestamp_mmss"),
                "clip_url": item.get("clip_url"),
                "frame_url": item.get("frame_url"),
                "thumbnail_url": item.get("thumbnail_url"),
            }

    candidates = read_json(base / "candidates.json", default=[]) or []
    for item in candidates:
        if item.get("crop_id") == candidate_id or item.get("candidate_id") == candidate_id:
            timestamp = item.get("timestamp_sec")
            if timestamp is None:
                break
            return {
                "candidate_id": candidate_id,
                "timestamp_sec": float(timestamp),
                "timestamp_mmss": item.get("timestamp_label") or item.get("timestamp_mmss"),
                "clip_url": None,
                "frame_url": None,
                "thumbnail_url": None,
            }

    raise LocalizationError(
        "CANDIDATE_NOT_FOUND",
        f"Candidate {candidate_id} was not found or has no timestamp.",
    )


def _apply_frame_summaries(frames: list[EvidenceFrame], summaries: dict[str, str]) -> None:
    for frame in frames:
        if frame.frame_id in summaries:
            frame.visual_summary = summaries[frame.frame_id]


def _write_failed(
    job_id: str,
    candidate_id: str,
    localization_id: str,
    event_hint: EventHint,
    code: str,
    message: str,
) -> None:
    write_localization_result(
        make_status_result(
            localization_id=localization_id,
            job_id=job_id,
            candidate_id=candidate_id,
            status=LocalizationStatus.failed,
            progress=Progress(stage="failed", message=message, percent=100),
            event_hint=event_hint,
            error={"code": code, "message": message},
        )
    )
