"""Streaming chat endpoint backed by the Anthropic SDK.

POST /api/chat
  body:  {"messages": [{"role": "user", "content": "hi"}], "system": "optional"}
  resp:  text/event-stream of `data: {"delta": "..."}` events, ending with
         `data: [DONE]`. Errors arrive as a single `data: {"error": "..."}`.
"""
import json
import os

import anthropic
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import DEFAULT_SYSTEM, MAX_TOKENS, MODEL

router = APIRouter()


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    system: str | None = None


def _client() -> anthropic.Anthropic:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not set. Add it to backend/.env.",
        )
    return anthropic.Anthropic(api_key=key)


@router.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    client = _client()  # raises 503 cleanly if the key is missing
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    system = req.system or DEFAULT_SYSTEM

    def event_stream():
        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'delta': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # surface one clean error event to the UI
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
