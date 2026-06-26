# Claude Impact Lab — Starter Kit

A tested, full-stack scaffold for the Mumbai Claude Impact Lab hackathon: a React UI
that streams real Claude responses through a FastAPI backend. Swap the prompt and
build your solution.

```
frontend/   Vite + React 19 + TS + Tailwind v4   (dev :5173)
backend/    FastAPI + Anthropic SDK              (dev :8000)
```

## Quickstart

1. **Add your API key**
   ```powershell
   Copy-Item .env.example backend/.env
   # edit backend/.env -> ANTHROPIC_API_KEY=sk-ant-...
   ```
2. **Run both servers**
   ```powershell
   ./run-dev.ps1
   ```
   Then open http://localhost:5173 and send a message — it streams from Claude.

### Run servers separately
```powershell
# Backend
cd backend
./.venv/Scripts/Activate.ps1
uvicorn app.main:app --reload --port 8000   # http://127.0.0.1:8000/docs

# Frontend
cd frontend
npm run dev
```

## What's wired
- `POST /api/chat` — streams Claude tokens over SSE (`backend/app/routes/chat.py`).
- `GET /api/health` — reports model + whether the API key is set.
- `frontend/src/lib/api.ts` — `streamChat()` / `getHealth()`.
- Model is set once in `backend/app/config.py` (`claude-opus-4-8`).

## Notes
- `.env` is gitignored — never commit your key.
- Path alias `@/` is configured, so `npx shadcn@latest add button` works if you want
  the shadcn/ui component set during the event.
- See `PLAYBOOK.md` for the hour-by-hour event runbook and `CLAUDE.md` for context.
