# Setu — Product Walkthrough and Implementation Status

> Current as of 2026-06-27. Read `CONTEXT.md` for the problem statement and data analysis. This document explains the implemented product, the demo workflow, how it maps to the original vision, and what remains pending.

---

## 1. The product in one sentence

**Setu is a shared missing-person operations layer that connects otherwise isolated Kumbh lost-and-found centers, turns a family's multilingual report into an operational case, finds likely cross-center matches, and keeps the family informed without exposing personal data.**

It is not a pilgrim app and it is not a facial-recognition system. The current build is a working local demonstration of the core operational loop.

---

## 2. Who uses which screen

### Screen A — Common Operating Picture

**Route:** `/`
**Users:** control-room staff, police officers, lost-and-found operators, and volunteers.

This is the main screen:

- The **map** combines missing-person cases with existing infrastructure:
  - case locations;
  - CCTV locations, not footage;
  - police stations;
  - chokepoints;
  - administrative zones.
- The **Cases panel** lets an operator search by case ID, place, center, language, or age band and filter by status.
- Clicking a **zone polygon** filters the queue to cases in that zone.
- Clicking a **case** opens its operational details and Reunify candidates.
- The header indicates whether **Claude is live** or Setu is operating in **Resilient mode** using deterministic fallbacks.
- The headline figures come from the supplied 2,500-record dataset and explain the problem: cross-center duplicates, unresolved cases, and the long resolution tail.

**Purpose:** replace the current "each center sees only its own register" model with one shared operating picture.

### Screen B — Beacon intake

**Entry:** **New report** on the Common Operating Picture
**Users represented:** a family member reporting through an app-free message; an operator can also use the same flow on their behalf.

The current interface simulates a WhatsApp/SMS report:

1. The user chooses a sample or writes a report in natural language.
2. They select the reporting center and provide purpose-bound consent.
3. Setu preserves the unfinished text as a local browser draft.
4. FastAPI sends the text to Claude for multilingual normalization and extraction.
5. Setu converts the message into gender, age band, language, and last-seen location.
6. The location is resolved to a zone, nearest police station, nearby CCTV locations, and chokepoints.
7. A new case ID and immediate deterministic candidate search are returned.

**Purpose:** accept the kind of incomplete, transliterated report people actually give without requiring them to install or understand a new app.

### Screen C — Case and Reunify drawer

**Entry:** select a map pin, case-list row, or hand a completed Beacon report to the console.
**User:** an authorized operator in the intended production system.

The drawer shows:

- operational fields used for matching;
- a separately grouped PII block, masked by default;
- explicit reveal/mask control for PII;
- the geo-resolution and nearby infrastructure;
- up to five found-person candidates;
- confidence, fields matched, found center, record notes, and a plain-language rationale;
- **Confirm reunion** and **Not a match** actions.

Confirming the strongest candidate:

- links the missing and found records;
- moves the case to `Reunited`;
- marks the found record as used;
- draws a bridge between the two centers on the map;
- updates the public family status page.

The backend rejects conflicting links so one case or found-person record cannot silently be attached to two different reunions.

**Purpose:** make Claude's recommendation inspectable and keep the consequential decision with a human operator.

### Screen D — Family tracking

**Route:** `/track/:caseId`
**User:** the reporting family.

The no-login page shows:

- case ID;
- Reported → Searching → Possible match → Reunited timeline;
- generic search area;
- automatic refresh every 15 seconds;
- English and Hindi interface options;
- no name, phone number, photograph, or other PII.

**Purpose:** reduce uncertainty for families without making sensitive information public.

---

## 3. End-to-end workflow

```text
Family sends a messy multilingual report
                    │
                    ▼
Beacon captures consent and submits to FastAPI
                    │
                    ▼
Claude extracts structured fields
                    │
                    ▼
Setu geo-resolves the last-seen location
                    │
                    ▼
Case is created and searched against every center's found-person pool
                    │
                    ▼
Operator receives ranked, explainable candidates
                    │
             human confirms match
                    │
                    ▼
Missing + found records are linked across centers
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
Family tracker updates     Case can be closed
to Reunited               and PII is purged
```

### Demonstration case

1. Open **New report**.
2. Choose **Maithili · Ramkund**.
3. Accept the consent statement and send.
4. Claude converts the transliterated message into:
   - Male;
   - age 71–80;
   - Maithili;
   - Ramkund Ghat.
5. Setu resolves Bhadrakali Police Station and nearby camera/chokepoint context.
6. Setu surfaces `FP-HERO-001`, recorded at another center, at approximately **93% confidence**.
7. Hand the case to the console and review why it matched.
8. Confirm the reunion.
9. Open the family tracking link and show `Reunited`.
10. Close the case and demonstrate automatic PII purge.

---

## 4. How this aligns with the original vision

| Original vision | How the build addresses it |
|---|---|
| **Copilot for government operations** | The implemented console gives operators a single case queue, map, infrastructure context, and explainable next action. A conversational operations copilot remains roadmap. |
| **Close the cross-center gap** | Missing and found records are searched across every seeded center; the hero workflow visibly links two different centers. |
| **No pilgrim app** | Intake is message-first and simulated as WhatsApp/SMS. The public tracker is a no-login web link. Real WhatsApp integration and a standalone QR route remain pending. |
| **Work with existing infrastructure** | Setu layers cases over supplied CCTV locations, police stations, zones, and chokepoints. It does not require new cameras or facial recognition. |
| **Geo-aware response** | Every intake resolves the last-seen location to operational infrastructure and displays it in the case drawer. |
| **Multilingual and sparse-data matching** | Claude normalizes multilingual/transliterated reports; deterministic scoring protects strong structured matches from model variability. |
| **Tiered autonomy** | Geo-routing and candidate ranking are automatic; confirming a reunion remains a human decision. Automatic duplicate merging is not yet implemented. |
| **Privacy by design** | Consent, masking, explicit reveal events, PII-free tracking, lifecycle guards, and post-reunion purge are implemented. Real authentication/RBAC and durable audit storage remain pending. |
| **Deployability** | The API boundaries, KML/CSV loaders, fallback behavior, and thin FastAPI service demonstrate the design. A durable database, queue, offline synchronization, and government identity integration are still required for production. |

The strongest alignment is the core proposition: **one operational view across centers, with AI resolving sparse multilingual records and a human controlling the high-stakes decision.**

---

## 5. Current architecture

```text
React + Vite frontend
├── Common Operating Picture
├── Beacon intake simulation
├── Reunify operator review
└── Family tracker
             │
             ▼
Python + FastAPI
├── intake and case lifecycle routes
├── Claude extraction and matching
├── deterministic safety-net matching
├── KML-first / CSV-fallback geo resolution
└── process-local seeded store
             │
             ▼
Supplied synthetic case data + synthesized found-person records
```

The local store is deliberate for demo reliability but resets whenever FastAPI restarts.

---

## 6. How Claude is used

### Implemented

- Extract structured fields from multilingual and transliterated free text.
- Normalize shortened locations such as `Ramkund` to an operational landmark.
- Rank found-person candidates and provide human-readable reasoning through `/api/match`.
- Fall back to deterministic extraction and matching if the API key or model is unavailable.
- Combine model reasoning with deterministic candidates so model variability cannot remove a strong structured match.

### Not implemented

- Generated PA announcements or family messages.
- A conversational operator copilot.
- Shift briefs, incident summaries, or autonomous task execution.
- Predictive crowd-risk or Foresight reasoning.

---

## 7. Implementation status

Legend: ✅ implemented · 🟡 partial · ⬜ pending

### Operational core

| Capability | Status | Notes |
|---|---:|---|
| Shared Common Operating Picture | ✅ | Map, case pins, infrastructure layers, queue, search, filters. |
| Zone-to-case drilldown | ✅ | Click a zone to filter the queue. |
| Case detail and geo context | ✅ | Includes station, cameras, chokepoints, and reporting center. |
| Responsive operator interface | ✅ | Desktop and mobile layouts verified. |
| Real-time multi-user updates | ⬜ | Current frontend state is local to one browser session. |

### Intake

| Capability | Status | Notes |
|---|---:|---|
| Simulated WhatsApp/SMS intake | ✅ | Multilingual free-text samples and custom text. |
| Consent capture | ✅ | Required by the current interface. |
| Local draft preservation | ✅ | Browser-local draft survives closing/reopening the modal. |
| Claude extraction | ✅ | One extraction call per intake endpoint. |
| Geo-resolution | ✅ | KML-first, CSV fallback. |
| Standalone QR/no-login intake route | ⬜ | The current intake is inside the operator console. |
| Detailed operator/kiosk form | ⬜ | No separate structured operator form yet. |
| Name, mobile, photo upload fields | ⬜ | Model supports some fields, but the current UI does not collect them. |
| Real WhatsApp/Meta integration | ⬜ | Simulation only. |
| Voice/IVR/non-literate intake | ⬜ | Roadmap. |
| Offline submission queue and sync | ⬜ | Only local draft storage exists today. |

### Matching and reunification

| Capability | Status | Notes |
|---|---:|---|
| Cross-center missing↔found matching | ✅ | Searches the synthesized found-person pool across centers. |
| Confidence and rationale | ✅ | Candidate score, matched fields, location, notes, and explanation. |
| Deterministic safety rails | ✅ | Protects strong matches from model omission. |
| Human approve/reject interaction | ✅ | Approval persists; rejection is session-local UI state. |
| Conflict-safe record linking | ✅ | Backend returns `409` for incompatible links. |
| Automatic duplicate detection/merge | ⬜ | The source dataset contains duplicates, but automated dedupe is not built. |
| Found-person intake workflow | ⬜ | Found records are currently synthesized at startup. |
| Persistent rejected-candidate decisions | ⬜ | Requires durable storage. |
| Notifications to both centers/family | ⬜ | The UI states the intended outcome; no SMS/WhatsApp is sent. |

### Family transparency and privacy

| Capability | Status | Notes |
|---|---:|---|
| No-login case tracker | ✅ | Public route with generic status only. |
| Automatic status polling | ✅ | Every 15 seconds. |
| English and Hindi tracker | ✅ | Other languages remain pending. |
| PII-free public response | ✅ | Verified at API level. |
| PII masked by default | ✅ | Bulk case listing cannot reveal PII. |
| Explicit individual reveal | ✅ | Reveal is deliberate and recorded in the process-local audit list. |
| PII purge after reunion | ✅ | Close is allowed only for reunited cases and is idempotent. |
| Authentication and role-based access | ⬜ | Required before any real deployment. |
| Durable audit-log UI/storage | ⬜ | Events exist only in process memory. |
| Configurable retention/legal workflows | ⬜ | Production requirement. |

### Deployment readiness

| Capability | Status | Notes |
|---|---:|---|
| Python/FastAPI backend | ✅ | All application backend work uses Python. |
| Local deterministic demo mode | ✅ | Works without a Claude API key. |
| KML and CSV geo loaders | ✅ | Revised KML is authoritative when present. |
| Production database/PostGIS | ⬜ | Current store resets on process restart. |
| Message/event queue | ⬜ | Needed for multi-center scale and notifications. |
| Multi-node concurrency controls | ⬜ | Current locks protect only one process. |
| Encryption and government IAM | ⬜ | Required for production PII. |
| Monitoring, backups, disaster recovery | ⬜ | Required for production operations. |
| Load and field testing | ⬜ | No 80M-scale or on-ground validation yet. |

---

## 8. Verification completed

- Frontend lint passes.
- Frontend production build passes with route-level code splitting.
- Python source compiles successfully.
- Full browser workflow verified:
  - Maithili report;
  - Ramkund normalization;
  - geo-resolution;
  - 93% hero candidate;
  - operator confirmation;
  - family tracker updates to Reunited.
- API privacy and lifecycle checks verified:
  - bulk case list remains masked;
  - explicit individual reveal works;
  - non-reunited close returns `409`;
  - public tracking response contains no PII;
  - closing a reunited case purges PII.
- Desktop and 390px mobile layouts have no horizontal overflow.
- No Markdown documentation refers to an Express backend.

---

## 9. Recommended next implementation order

### Priority 1 — Complete the honest field workflow

1. Build a real **found-person intake** screen.
2. Build a standalone **QR/no-login family intake** route.
3. Add the fuller **operator/kiosk form** with optional contact and photograph.
4. Persist candidate rejection and case history.

These changes make the demo represent both sides of a real reunion rather than relying on synthesized found records.

### Priority 2 — Make the privacy and deployment story credible

1. Replace the process-local store with PostgreSQL/PostGIS.
2. Add government/operator authentication and role-based PII access.
3. Store immutable audit events.
4. Add encrypted media storage and configurable retention.
5. Add an offline kiosk queue with visible synchronization state.

### Priority 3 — Extend the vision

1. Add real WhatsApp/SMS integration and notifications.
2. Add an operator Copilot for summaries, translations, announcements, and shift handoffs.
3. Add Foresight using report-rate as an explicitly labeled crowd-stress proxy.
4. Add escalation workflows for vulnerable children, suspected abduction, and medical transfer.

---

## 10. Scope statement for presentations

Say this clearly:

> "This is a working proof of the core cross-center loop, not a production deployment. It demonstrates multilingual intake, geo-aware case creation, explainable cross-center matching, human approval, family transparency, and privacy lifecycle controls. Production still requires real found-person ingestion, WhatsApp integration, offline synchronization, durable storage, authentication, and field testing."

That framing is both credible and aligned with the incubation/deployability criterion.
