"""Case board (COP live layer), found-person pool, public track page, and the
reunification confirm / close actions."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.store import get_store

router = APIRouter()


def _mask(case, reveal: bool) -> dict:
    """DPDP: PII masked by default in the ops UI (PLAN.md §2.5)."""
    d = case.model_dump()
    if not reveal:
        pii = d["pii"]
        if pii.get("name"):
            pii["name"] = pii["name"][0] + "•••"
        if pii.get("mobile"):
            pii["mobile"] = "•••• ••" + pii["mobile"][-3:]
    return d


@router.get("/cases")
def list_cases() -> dict:
    """Operational list is always masked; bulk PII reveal is intentionally absent."""
    s = get_store()
    return {"cases": [_mask(c, False) for c in s.cases.values()]}


@router.get("/cases/{case_id}")
def get_case(case_id: str, reveal: bool = False) -> dict:
    s = get_store()
    c = s.cases.get(case_id)
    if not c:
        raise HTTPException(404, "Case not found")
    if reveal:
        s.record_reveal(case_id)
    return _mask(c, reveal)


@router.get("/found")
def list_found() -> dict:
    s = get_store()
    return {"found": [f.model_dump() for f in s.found.values()]}


@router.get("/track/{case_id}")
def track(case_id: str) -> dict:
    """Public, no-login, NO PII (PLAN.md §2.4)."""
    s = get_store()
    c = s.cases.get(case_id)
    if not c:
        raise HTTPException(404, "Case not found")
    order = ["Reported", "Pending", "Matched", "Reunited"]
    stage = c.status if c.status in order else ("Reunited" if c.status == "Transferred" else "Pending")
    return {
        "caseId": c.id,
        "stage": stage,
        "stages": order,
        "genericLocation": c.geo.zone,
        "reportedAt": c.reportedAt,
        "updated": True,
    }


class LinkBody(BaseModel):
    caseId: str
    foundId: str


@router.post("/reunify/confirm")
def confirm(body: LinkBody) -> dict:
    """Operator approves a reunification candidate → link + advance to Reunited."""
    s = get_store()
    try:
        s.link(body.caseId, body.foundId)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"ok": True, "case": s.cases[body.caseId].model_dump()}


class CloseBody(BaseModel):
    caseId: str


@router.post("/cases/close")
def close(body: CloseBody) -> dict:
    """Close a case → DPDP auto-purge of PII."""
    s = get_store()
    if body.caseId not in s.cases:
        raise HTTPException(404, "Case not found")
    try:
        s.purge_pii(body.caseId)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"ok": True, "case": s.cases[body.caseId].model_dump()}
