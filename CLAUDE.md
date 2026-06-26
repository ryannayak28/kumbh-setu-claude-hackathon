# Claude Impact Lab — Project Memory

Context for every Claude Code session in this repo.

## The event
Mumbai | Claude Impact Lab (2026-06-27). One-day hackathon. Build a Claude-powered
solution to a **civic problem at Kumbh Mela 2027** affecting ~80M people. Problem
statement is revealed at the 9 AM kickoff. Submission 5 PM, demos 6 PM.

**Judging criteria (optimize for all four):** real-world impact · technical
execution · creativity · **deployability** (winners get incubated toward an actual
Kumbh Mela 2027 deployment, so a credible scale/government/offline/multilingual
story matters).

## Stack
- **Frontend:** `frontend/` — Vite + React 19 + TypeScript + Tailwind v4. UI libs:
  lucide-react (icons), framer-motion (animation). Dev server on :5173.
- **Backend:** `backend/` — FastAPI + Anthropic SDK. Runs on :8000. Python 3.13 in
  `backend/.venv`. The Vite dev server proxies `/api/*` to the backend.
- **Model:** `claude-opus-4-8` (set in `backend/app/config.py` — change there once).

## Run it
```powershell
./run-dev.ps1            # starts backend + frontend in two windows
# or, separately:
# backend:  cd backend; ./.venv/Scripts/Activate.ps1; uvicorn app.main:app --reload --port 8000
# frontend: cd frontend; npm run dev
```
Requires `backend/.env` with `ANTHROPIC_API_KEY=...` (copy from `.env.example`).

## Key files
- `backend/app/routes/chat.py` — streaming `/api/chat` (SSE). The plumbing to reuse.
- `backend/app/config.py` — model, system prompt, max tokens.
- `frontend/src/lib/api.ts` — `streamChat()` / `getHealth()` client.
- `frontend/src/App.tsx` — chat UI. Replace with your solution's UI.

## Conventions
- Never commit secrets. `.env` is gitignored; `.env.example` is the template.
- Keep the backend thin; put one Claude call behind one endpoint.
- Use the latest, most capable Claude model by default.
