"""FastAPI entrypoint for the Claude Impact Lab kit.

Run from the backend/ directory:
    uvicorn app.main:app --reload --port 8000
"""
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before anything reads ANTHROPIC_API_KEY. override=True so a freshly
# edited .env (e.g. tomorrow's event key) always wins over a stale shell variable.
load_dotenv(override=True)

from app.routes import (  # noqa: E402  (after load_dotenv on purpose)
    cases,
    chat,
    geo,
    health,
    intake,
    match,
)

app = FastAPI(title="Setu — Claude Impact Lab API")

# Allow the Vite dev server to call us directly during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(geo.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(intake.router, prefix="/api")
app.include_router(match.router, prefix="/api")


@app.on_event("startup")
def _warm_store() -> None:
    """Build + seed the in-memory store at boot so the first request is fast."""
    from app.data.store import get_store

    get_store()
