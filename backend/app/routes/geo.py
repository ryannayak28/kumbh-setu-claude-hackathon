"""Static geographic backbone for the COP map + headline stats."""
from fastapi import APIRouter

from app.data.store import get_store

router = APIRouter()


@router.get("/geo")
def geo() -> dict:
    s = get_store()
    return s.geo.model_dump()


@router.get("/stats")
def stats() -> dict:
    return get_store().stats
