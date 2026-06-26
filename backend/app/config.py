"""Single place to change model / system prompt for the whole backend."""

# Latest, most capable Claude model. Swap to claude-sonnet-4-6 for cheaper/faster.
MODEL = "claude-opus-4-8"

# Default system prompt. Override per-request via the `system` field on /api/chat.
DEFAULT_SYSTEM = (
    "You are a helpful assistant for a civic-tech hackathon team building a "
    "solution for Kumbh Mela 2027. Be concise, practical, and impact-focused."
)

MAX_TOKENS = 1024
