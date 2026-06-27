"""Re-run Reunify for an existing case on demand (the board's 'find matches')."""
from fastapi import APIRouter, HTTPException

from app import claude_setu
from app.data.store import get_store

router = APIRouter()


@router.post("/match/{case_id}")
def match(case_id: str) -> dict:
    s = get_store()
    case = s.cases.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    candidates, engine = claude_setu.match(case, s.unmatched_found())
    if candidates and case.status not in ("Reunited", "Transferred"):
        case.status = "Matched"
    return {
        "caseId": case_id,
        "engine": engine,
        "candidates": [c.model_dump() for c in candidates],
    }
