# Setu

Setu is a cross-center missing-person reunification layer for the Nashik–Trimbakeshwar Simhastha Kumbh Mela 2027. It gives lost-and-found desks and police teams one operating picture, turns sparse multilingual reports into structured cases, and surfaces explainable found-person matches for human approval.

## What works

- **Common Operating Picture:** live cases over CCTV, police-station, chokepoint, and zone data; searchable case queue and zone drilldown.
- **Beacon intake:** app-free WhatsApp/SMS simulation with multilingual extraction, geo-resolution, explicit consent, and a local draft.
- **Reunify:** cross-center candidate ranking with confidence, matched fields, operator approval, and deterministic safety rails around Claude.
- **Family tracking:** no-login, bilingual status page with automatic refresh and no PII.
- **DPDP-lite:** masked-by-default personal data, explicit reveal, lifecycle guards, and automatic PII purge when a reunited case closes.
- **Resilient demo:** deterministic extraction and matching remain available without an API key.

## Stack

```text
frontend/   Vite + React 19 + TypeScript + Tailwind v4 + Leaflet
backend/    Python 3.13 + FastAPI + Anthropic SDK + Pydantic
```

The Vite server proxies `/api/*` to FastAPI. Geographic KML files are authoritative; CSV files are the fallback. The hackathon build uses a process-local seeded store, with the domain boundaries kept ready for a durable database and queue.

## Run locally

1. Copy the environment template and add a key if live Claude calls are required:

   ```powershell
   Copy-Item .env.example backend/.env
   # backend/.env -> ANTHROPIC_API_KEY=...
   ```

2. Start both services:

   ```powershell
   ./run-dev.ps1
   ```

3. Open [http://localhost:5173](http://localhost:5173). FastAPI documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

Without `ANTHROPIC_API_KEY`, Setu automatically shows **Resilient mode** and uses its deterministic fallback.

## Demo path

1. From the operating picture, choose **New report**.
2. Select **Maithili · Ramkund**, accept the purpose-bound consent, and send.
3. Setu geo-resolves the report and returns the planted `FP-HERO-001` cross-center candidate at approximately 93%.
4. Hand the case to the console, review the rationale, and confirm the reunion.
5. Open the family status link, then close the case to demonstrate automatic PII purge.

## Core API

- `GET /api/health`, `/api/geo`, `/api/stats`
- `GET /api/cases`, `/api/cases/{case_id}`, `/api/track/{case_id}`
- `POST /api/intake`, `/api/match/{case_id}`
- `POST /api/reunify/confirm`, `/api/cases/close`

## Deployment path

The local store is deliberately scoped to demo reliability. A production rollout replaces it with PostgreSQL/PostGIS, an event queue, and center-scoped identity/access controls while preserving the API contracts. Intake can queue locally at kiosks and sync when connectivity returns; matching remains human-approved, and public tracking remains PII-free.

See [CONTEXT.md](CONTEXT.md) for the problem and data analysis and [PLAN.md](PLAN.md) for the implementation contract.
