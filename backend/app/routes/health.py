"""Health/readiness endpoint."""
import os

from fastapi import APIRouter

from app.config import MODEL

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """Cheap liveness check. `model_ready` is False until a key is configured."""
    return {
        "status": "ok",
        "model": MODEL,
        "model_ready": bool(os.environ.get("ANTHROPIC_API_KEY")),
    }
