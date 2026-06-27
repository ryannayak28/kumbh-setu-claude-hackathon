# Setu — Implementation Plan (v1)

> Read `CONTEXT.md` first. This is the build plan for the v1 operational core: **COP + Beacon + Reunify + Seeker** (+ DPDP-lite). Copilot and Foresight are roadmap (see CONTEXT §6).

---

## 1. Architecture

Single coherent web app = the "Palantir layer".

```
                 ┌──────────────────────────────────────────────┐
   Pilgrim ──────▶  Beacon intake (WhatsApp-sim / QR web form)   │
   (no app)      │        │                                      │
                 │        ▼                                      │
   Operator ─────▶  Express API  ──▶  Claude proxy (normalize,   │
   (kiosk)       │   (seed store)     translate, extract, match) │
                 │        │                ▲                     │
                 │        ▼                │ heuristic fallback  │
                 │   In-memory/SQLite store (cases, found, geo)  │
                 │        │                                      │
   Ops team ─────▶  React console: COP map + Reunify + drilldown │
   Family   ─────▶  Seeker /track/:caseId (no-login, no PII)     │
                 └──────────────────────────────────────────────┘
```

**Stack:** React + Vite + TypeScript, Tailwind, react-leaflet (map). Thin Node/Express backend: serves seeded data + proxies Claude (key server-side, prompts in `server/prompts/`). Store = in-memory JSON seeded at boot (SQLite optional). All local — nothing to provision, so the demo can't break on network/provisioning.

**Why this stack:** fastest path to a polished, reliable, all-local demo. Full FastAPI+DB adds demo-risk for little pitch upside; Streamlit loses the map-driven ops feel that *is* the pitch.

---

## 2. Modules (isolated units, each with a clear contract)

### 2.1 `cop/` — Common Operating Picture
- Leaflet map of Nashik. Toggleable static layers: CCTV (clustered by zone), police stations, chokepoints (styled by category), zone boundaries (polygons). Live overlay: active cases as pins (color by status/age-band).
- Click zone → side panel listing that zone's open cases. Click case → case detail (with Reunify candidates).
- **Contract:** reads `cases`, `zones`, `geo`.

### 2.2 `beacon/` — Intake
- **Pilgrim:** a **simulated WhatsApp/SMS thread** component + a **QR→no-login web form** (name optional, gender, age-band, language, last-seen, optional photo). Guided, minimal, accessible.
- **Operator/kiosk:** fuller form for a volunteer entering on a pilgrim's behalf.
- On submit → `POST /api/intake` → Claude **normalize + translate + extract** free text → **geo-resolve** (snap last-seen string → nearest zone centroid; return nearest-N CCTV, nearest police station, nearby chokepoints) → create `Case` → return `case_id` + geo-resolution + a status link.
- **Contract:** writes a `Case`; returns `{caseId, geo}`.

### 2.3 `reunify/` — Matching engine (HERO)
- On new case (or new `FoundPerson`), `POST /api/match` → Claude ranks candidate records **across all centers** with `score` (0–1) + plain-language `rationale` + `fieldsMatched[]`, over sparse/multilingual/partial fields.
- **Tiered autonomy:** auto-merge ≥ very-high-confidence **duplicates** (the 8%); surface **found↔missing reunification** candidates as **Approve/Reject** cards.
- **Contract:** `match(caseId) → MatchCandidate[]`.

### 2.4 `seeker/` — Transparency
- Public `/track/:caseId` no-login page: stage timeline (Reported → Matched → Reunited/Transferred), generic location, **no PII**. Reached via the case-id link from Beacon.

### 2.5 `governance/` — DPDP-lite (cross-cutting, woven into 2.2–2.4)
- PII (name, mobile, photo, free-text) stored in a **separate block** from operational/matchable fields and **masked by default** in the ops UI (reveal = an explicit action).
- Consent flag captured at intake. **Auto-purge** PII on case close (Reunited). `/track` exposes no PII. (Full audit-log view = roadmap.)

---

## 3. How Claude is used (AI spine, v1)
- **Normalize / translate / extract** messy multilingual free-text intake → structured `Case` fields.
- **Entity resolution:** cross-center match ranking with confidence + human-readable rationale (the hard, defensible core).
- **Light generation:** the WhatsApp status reply / case-id confirmation text.
- All via Anthropic API behind the Express proxy. **Heuristic fallback** (name/phonetic + age-band + gender + location/zone + language overlap) runs when no API key, so the app always works.

---

## 4. Data model — `shared/types.ts`
```ts
type AgeBand = '0-12'|'13-17'|'18-40'|'41-60'|'61-70'|'71-80'|'80+';
type Status  = 'Reported'|'Pending'|'Matched'|'Reunited'|'Transferred'|'Unresolved';
type Channel = 'whatsapp'|'web'|'operator'|'kiosk';

interface PII { name?: string; mobile?: string; photoUrl?: string;
                physicalDescription?: string; consent: boolean; purgedAt?: string; }

interface GeoResolution { zone: string; nearestCctv: string[];
                          nearestStation: string; nearbyChokepoints: string[]; }

interface Case {
  id: string; reportedAt: string; channel: Channel;
  gender: 'Male'|'Female'|'Unknown'; ageBand: AgeBand;
  state?: string; district?: string; language?: string;
  lastSeenLocation: string; reportingCenter: string;
  status: Status; geo: GeoResolution; pii: PII;
  linkedFoundId?: string; resolutionHours?: number;
}

interface FoundPerson {        // synthesized (dataset has no found-side records)
  id: string; foundAt: string; center: string;
  gender: 'Male'|'Female'|'Unknown'; ageBand: AgeBand;
  language?: string; observedLocation: string;
  note?: string; matchedCaseId?: string;
}

interface Geo {                // from KML (authoritative) or CSV (fallback)
  cctv: {id:string; lat:number; lng:number; zone:string}[];
  stations: {name:string; lat:number; lng:number}[];
  chokepoints: {name:string; category:string; lat:number; lng:number}[];
  zones: {name:string; lat:number; lng:number; polygon?:[number,number][]}[];
}

interface MatchCandidate { caseId:string; score:number;
                           rationale:string; fieldsMatched:string[]; tier:'auto'|'review'; }
```

---

## 5. File structure
```
setu/
  .env                 # ANTHROPIC_API_KEY=...
  package.json         # dev script runs server + vite concurrently
  server/
    index.ts
    routes/  intake.ts  match.ts  cases.ts
    prompts/ normalize.ts  match.ts
    data/    seed.ts   # CSV/KML → JSON; synthesize FoundPerson pairs
             geo.ts    # nearest-CCTV / nearest-station / point-in-zone helpers
             claude.ts # Anthropic client + heuristic fallback
  src/
    modules/ cop/  beacon/  reunify/  seeker/  governance/
    components/ map/  case-card/  candidate-card/  layout/  wordmark/
    lib/ api.ts  theme.ts   # design tokens from the frontend-design pass
    shared/types.ts
  public/  qr-poster.(svg|png)
```

---

## 6. Build order
1. **Scaffold** — Vite React TS + Tailwind + Express; `dev` runs both concurrently; folder skeleton.
2. **Data layer** — `shared/types.ts`; `seed.ts` (parse CSV now; KML-capable for the revised files); `geo.ts` helpers; synthesize `FoundPerson` match pairs (incl. the planted Act-2 94% pair).
3. **Server** — `claude.ts` (Anthropic + heuristic fallback); prompts; routes `intake` / `match` / `cases`.
4. **Design language** — run the **frontend-design skill** to produce tokens + the ops/command-center aesthetic; write `theme.ts` + app shell/layout + wordmark.
5. **COP** — map + static layers (from `kumbh-data-visualization-by-gpt.html` plotting approach) + live case pins + zone/case drill-down.
6. **Beacon** — QR web form + simulated WhatsApp thread + operator form → wired to `/api/intake`.
7. **Reunify** — candidate cards with score/rationale; auto-merge duplicates; Approve/Reject for reunification.
8. **Seeker + DPDP-lite** — `/track/:caseId`; PII separation/masking; auto-purge on close.
9. **Demo seed + dry-run** — stage the 3-act script through the real pipeline; full end-to-end pass.

---

## 7. Verification (end-to-end)
1. `npm run dev` → COP map shows all 4 static layers (KML if uploaded, else CSV) + seeded active cases; layer toggles + zone→case drill-down work.
2. **Beacon→Reunify:** submit Act-2 intake via web form → case created with correct geo-resolution (nearest CCTV/station via `geo.ts`) → `/api/match` returns the planted ~94% candidate with a coherent rationale → approve → statuses update.
3. **Reunify dedupe:** feed a near-duplicate of an existing case → auto-merge fires at very-high confidence; a borderline match shows Approve/Reject and only links on approve.
4. **Seeker + DPDP:** `/track/:caseId` shows correct stage and **no PII**; closing a case auto-purges PII; PII masked by default in the ops UI.
5. Walk the full 3-act demo script start-to-finish without errors.

---

## 8. Out of scope in v1 (state honestly to judges)
Copilot + Foresight/VaR (roadmap); real WhatsApp/Meta API; voice/IVR; real CCTV footage / face-recognition (locations only); full abduction/abandonment detection (only an escalation flag → route-to-police stub, acknowledged as partial).

---

## 9. Open items (not blockers)
- Final product name (working: **Setu**; alt: **Drishti**).
- Optional offline-sync visual (queue → sync) if time allows.
- Swap CSV → revised KML geo when the user uploads it.
- Roadmap modules (Copilot, Foresight) — separate spec/plan cycles after v1.
