# Hackathon Playbook — 2026-06-27

Your hour-by-hour runbook and Claude Code skill→task map. The goal: a **working,
deployable-looking demo** by 5 PM that scores on impact, execution, creativity,
and deployability.

## Before you leave home / on arrival (8:00–9:00)
- [ ] `backend/.env` has a real `ANTHROPIC_API_KEY` (you'll also get event credits).
- [ ] `./run-dev.ps1` works → open http://localhost:5173, send a message, see it stream.
- [ ] `git status` clean. Push the kit to a fresh private GitHub repo (ryannayak28).
- [ ] Find your team. Every team needs more than engineers — grab a domain/pitch person.

## Problem briefing (9:00–9:30)
- Capture the EXACT problem statement + any constraints into `CLAUDE.md`.
- Note the domain experts in the room; write down questions for them.

## Brainstorm & scope (9:30–10:15) — **don't skip**
- Run `/superpowers:brainstorming` to pressure-test the idea before coding.
- Pick ONE narrow, demoable slice. Write the 1-sentence pitch + the demo's "wow moment".
- Decide the deployability story now (scale to 80M, offline/low-connectivity,
  multilingual, government integration) — judges score it.

## Build (10:15–16:30)
- `/feature-dev:feature-dev` for guided feature work.
- Split independent work across subagents (`dispatching-parallel-agents`).
- `/frontend-design:frontend-design` to make the demo screen genuinely impressive.
- Reuse `backend/app/routes/chat.py` for any Claude call; add new endpoints alongside.
- Commit often. Keep `main` runnable.

## Lock & polish (16:30–17:00) — submission 17:00
- `/code-review` for a clean, working demo. Kill anything half-built.
- Tag/commit the submission state. Confirm `run-dev.ps1` still boots from clean.
- Write the submission text (impact + deployability framing).

## Demo prep (17:00–18:00)
- `anthropic-skills:pptx` → judging deck (problem → solution → live demo → impact →
  deployment path → ask). Keep to ~5 slides.
- `visualize` tool → architecture + "80M at scale" graphic.
- Rehearse the 3-minute demo. Lead with the wow moment, not the setup.

## Demos & judging (18:00)
- Open with the problem and who it hurts. Show the live demo. Close on the
  Kumbh Mela 2027 deployment path. Have a fallback (recording/screenshots) if wifi dies.

## Quick reference — skills
| Need | Use |
|---|---|
| Scope the idea | `superpowers:brainstorming` |
| Build a feature | `feature-dev:feature-dev` |
| Polish the UI | `frontend-design:frontend-design` |
| Parallel work | `superpowers:dispatching-parallel-agents` |
| Debug fast | `superpowers:systematic-debugging` |
| Pre-submit review | `/code-review` |
| Pitch deck | `anthropic-skills:pptx` |
| Diagrams/visuals | `visualize` tool |
| Repo/PRs from chat | GitHub MCP (already connected as ryannayak28) |
