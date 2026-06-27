"""Beacon intake → Claude normalize/extract → geo-resolve → create Case →
instantly run Reunify and return candidates (PLAN.md §2.2)."""
from fastapi import APIRouter, HTTPException

from app import claude_setu
from app.data import geo as geohelp
from app.data.store import get_store
from app.models import Case, IntakeRequest, IntakeResponse, PII

router = APIRouter()


@router.post("/intake", response_model=IntakeResponse)
def intake(req: IntakeRequest) -> IntakeResponse:
    s = get_store()
    if not req.rawText and not req.lastSeenLocation:
        raise HTTPException(
            status_code=422,
            detail="Add a short report or a last-seen location.",
        )

    # 1. Extract structured fields from free text (Claude → heuristic fallback),
    #    then let any explicit form fields override.
    extracted, engine = ({}, "heuristic")
    if req.rawText:
        extracted, engine = claude_setu.extract(req.rawText)

    gender = req.gender or extracted.get("gender") or "Unknown"
    age_band = req.ageBand or extracted.get("ageBand") or "18-40"
    language = req.language or extracted.get("language")
    last_seen = req.lastSeenLocation or extracted.get("lastSeenLocation") or ""
    name = req.name or extracted.get("name")

    # 2. Geo-resolve last-seen → zone + nearest CCTV / station / chokepoints.
    geores = geohelp.resolve(last_seen, s.geo)

    # 3. Create the case.
    case = Case(
        id=s.next_case_id(),
        reportedAt=__import__("datetime").datetime.now().isoformat(timespec="minutes"),
        channel=req.channel,
        gender=gender if gender in ("Male", "Female") else "Unknown",
        ageBand=age_band,
        language=language,
        lastSeenLocation=last_seen,
        reportingCenter=req.reportingCenter or "Beacon (self-report)",
        status="Reported",
        geo=geores,
        pii=PII(
            name=name if req.consent else None,
            mobile=req.mobile if req.consent else None,
            consent=req.consent,
        ),
    )
    s.add_case(case)

    # 4. Reunify immediately with the deterministic safety-net scorer. Intake
    # has already used its one Claude call for multilingual extraction; the
    # operator can request deeper Claude-assisted reasoning via /api/match.
    candidates = claude_setu.heuristic_match(case, s.unmatched_found())
    if candidates:
        case.status = "Matched"

    return IntakeResponse(
        case=case,
        candidates=candidates,
        extractedBy=engine if req.rawText else "heuristic",
        trackUrl=f"/track/{case.id}",
    )
