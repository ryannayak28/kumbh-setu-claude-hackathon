# Lost Person POV Search

Local-first hackathon MVP for finding candidate sightings in short POV/event footage.

The app samples video frames locally, detects person crops with YOLO, creates labeled contact sheets, asks a configured VLM provider to score those crops, and returns ranked candidate sightings with timestamps, thumbnails, and clips for human review.

This does not perform identity verification, face recognition, or real-time CCTV search. Results are candidate sightings only.

## Location Breadcrumbs

After a person-search job finishes, each candidate card includes **Localize This Sighting**. The localization flow extracts full context frames around the candidate timestamp, runs OCR/clue extraction, generates Nashik-scoped map queries, ranks possible zones, and shows evidence frames plus map pins. Outputs are persisted under `api/outputs/jobs/<job_id>/localizations/<localization_id>/`.

The feature is hard-geofenced to two Nashik Kumbh areas: the Godavari Ramkund/Godaghat/Panchavati corridor and the Kushawarta Kund / Trimbak area. External map providers can corroborate a zone, but results outside those zones are discarded.

## Backend

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

`ffmpeg` must be installed and available on `PATH` for result clips.

## Frontend

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Claude Scoring

The default `.env.example` uses `VLM_PROVIDER=claude` and `ANTHROPIC_MODEL=claude-sonnet-4-6` for real contact-sheet scoring. Set `ANTHROPIC_API_KEY` in `api/.env`.

Use `VLM_PROVIDER=mock` only for offline UI demos without cloud scoring.

## Optional Localization Providers

Set these in `api/.env` when available:

```bash
OCR_PROVIDER=google_vision
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
GOOGLE_MAPS_API_KEY=...
NOMINATIM_ENABLED=true
```

For a fully local UI demo:

```bash
OCR_PROVIDER=mock
GOOGLE_PLACES_ENABLED=false
NOMINATIM_ENABLED=false
OVERPASS_ENABLED=false
WEB_GROUNDING_PROVIDER=none
```
