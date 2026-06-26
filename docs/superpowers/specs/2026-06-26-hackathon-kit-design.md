# Hackathon Kit — Design Spec

**Date:** 2026-06-26
**Author:** Ryan Nayak (with Claude Code)
**Context:** Cold-start scaffold for the Mumbai | Claude Impact Lab hackathon (2026-06-27). One-day build; problem statement (a Kumbh Mela 2027 civic problem affecting ~80M people) is revealed at 9 AM. Judging: real-world impact, technical execution, creativity, deployability.

## Goal

Walk into the venue with a **tested, runnable full-stack scaffold** where a real Claude API call already streams end-to-end. Tomorrow = swap the prompt, build the feature, polish the UI. No setup friction during the 8-hour clock.

## Decisions (confirmed)

| Area | Choice | Rationale |
|---|---|---|
| Node runtime | **Upgrade to Node 22 LTS** (winget) | Node 18 is EOL; latest Vite 7 needs Node 20.19+/22.12+. 22 LTS maintained to 2027. |
| Python | **Keep 3.13.9** (miniconda) | Current stable, fully supported. |
| Frontend | **Vite + React + TypeScript** | Fast HMR, standard, demo-friendly. |
| Styling/UI | **Tailwind CSS + shadcn/ui + lucide-react + framer-motion** | Polished, modern, non-templated demo UI fast. |
| Backend | **FastAPI** | Async, auto `/docs`, native SSE streaming for Claude, Pydantic validation. |
| Python env | **venv + pip** (`backend/.venv`) | Bulletproof, zero new global installs, `requirements.txt`. |
| LLM | **Anthropic SDK**, model `claude-opus-4-8` | Latest/most capable; one swap to change models. |

## Architecture

```
Claude-Impact/
├── frontend/                # Vite + React + TS + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── App.tsx          # Minimal chat UI calling the backend, streamed
│   │   ├── lib/api.ts       # fetch wrapper hitting /api/* (Vite proxy)
│   │   └── components/ui/    # shadcn components (button, input, card)
│   └── vite.config.ts       # dev proxy /api -> http://127.0.0.1:8000
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── main.py          # app, CORS, router include
│   │   ├── routes/chat.py   # POST /api/chat -> streams Claude tokens (SSE)
│   │   └── routes/health.py # GET /api/health -> {"status":"ok"}
│   ├── requirements.txt     # fastapi, uvicorn[standard], anthropic, python-dotenv
│   └── .venv/               # gitignored
├── .env.example             # ANTHROPIC_API_KEY=  (real .env gitignored)
├── .gitignore               # .env, .venv, node_modules, dist, __pycache__
├── CLAUDE.md                # event context + judging criteria for every session
├── PLAYBOOK.md              # hour-by-hour runbook + skill->task map
├── run-dev.ps1              # starts backend + frontend together
└── README.md                # quickstart
```

### Data flow
1. React UI POSTs `{messages}` to `/api/chat`.
2. Vite dev server proxies `/api` to FastAPI on `127.0.0.1:8000`.
3. FastAPI route calls Anthropic SDK with `stream=True`, relays tokens as Server-Sent Events.
4. UI appends streamed tokens to the message in real time.

### Interfaces (stable contracts)
- `GET /api/health` → `200 {"status":"ok","model":"claude-opus-4-8"}`
- `POST /api/chat` body `{"messages":[{"role":"user","content":"..."}]}` → `text/event-stream` of token deltas, terminated by a `[DONE]` event.
- Frontend `lib/api.ts` exposes `streamChat(messages, onToken)`.

### Error handling
- Missing `ANTHROPIC_API_KEY` → backend `/api/health` reports `"model_ready": false`; `/api/chat` returns a clear 503 with a human message (no stack trace to UI).
- Anthropic SDK errors → caught, logged server-side, surfaced to UI as a single error event.
- CORS configured for the Vite dev origin so a standalone frontend dev session still works.

## Testing / verification (must pass before "done")
1. `node --version` reports v22.x after upgrade.
2. Backend: `uvicorn` boots; `GET /api/health` returns ok.
3. With a real key in `.env`: `POST /api/chat` streams a non-empty Claude response (a scripted curl/Python test).
4. Frontend: `npm run dev` boots, page loads, typing a message streams a reply.
5. `run-dev.ps1` brings up both with one command.
6. `git status` clean except intended files; no secrets committed.

## Out of scope (YAGNI for tonight)
- Auth, database, deployment configs, Docker, tests beyond the smoke checks above. These get added tomorrow *if the chosen solution needs them* — the scaffold stays minimal and generic so it bends to any problem statement.
