"""Single place to change model / system prompt for the whole backend."""
from pathlib import Path

# Latest, most capable Claude model. Swap to claude-sonnet-4-6 for cheaper/faster.
MODEL = "claude-opus-4-8"

# Default system prompt. Override per-request via the `system` field on /api/chat.
DEFAULT_SYSTEM = (
    "You are a helpful assistant for a civic-tech hackathon team building a "
    "solution for Kumbh Mela 2027. Be concise, practical, and impact-focused."
)

MAX_TOKENS = 1024

# --- Setu ---------------------------------------------------------------
# Authoritative geo source = the revised KML pack; CSVs are the fallback.
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "hackathon-data" / "data-kml"
DATA_DIR_FALLBACK = REPO_ROOT / "hackathon-data" / "data"

# How many synthetic missing-person reports to seed as the live operational
# board. (The full 2,500 power the headline stats; a slice becomes live cases.)
SEED_LIVE_CASES = 120
