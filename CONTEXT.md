# Setu — Project Context

> Everything needed to start building cold in a fresh directory. Read this first, then `PLAN.md`.
> Source: India's First Claude Impact Lab, Mumbai, 27 June 2026 (RIIDL, Somaiya Vidyavihar University) — Problem statement on Missing-Persons Reunification at the Nashik–Trimbakeshwar Simhastha Kumbh Mela 2027. In partnership with Kumbhathon Innovation Foundation and the Government of Maharashtra.

---

## 1. The problem

Over **80 million pilgrims** attend the Nashik–Trimbakeshwar Simhastha Kumbh Mela (2027). At this scale, **thousands go missing every day**, mostly **elderly pilgrims separated from family**. The current system relies on **manual lost-and-found centers with NO cross-search between centers**: a found person registered at Center A is invisible to a family searching at Center B.

**Core mission:** close that cross-center gap — and do much more around it. Build a proactive, scalable, app-free solution that helps the on-ground government/police ops team resolve cases faster while being transparent with families.

---

## 2. Product vision (what we decided to build)

**Setu** (working name; alt: *Drishti*) — a **"Palantir-style" operations layer** built *on top of the data and infrastructure the government already has*. We do not replace the centers; we make their records mutually visible and auto-linked, and give the ops team a single command-center view.

Key principles drawn from the user's direction:
- **Copilot for the on-ground gov ops team is the heart.** Help police/organizers resolve faster; provide a bird's-eye view with the ability to drill down.
- **Proactive, not reactive.** Anticipate where separations cluster; prepare for worst-case congestion (roadmap — see §6).
- **No pilgrim app.** In 2025 the Kumbh registration app reached ~1 lakh of 60cr+ pilgrims. Pilgrims will not install apps. The pilgrim-facing channel must be **app-free** (WhatsApp/SMS-style + QR→no-login web form).
- **Layer on the existing ecosystem.** Static infra data (CCTV, police, zones, chokepoints) is the geographic backbone; missing-person reports are the live transactional layer.
- **Geo-aware.** Given a reported last-seen location, surface the relevant CCTV cameras, nearest police station(s), and nearby chokepoints.
- **Responsible data (DPDP / privacy by design).** Consent at intake, PII minimization, purpose-bound access, auto-purge after reunification.
- **Tiered autonomy** (gov/police audience): auto for low-risk actions (dedupe, geo-routing); human-approved for high-stakes (confirming a reunification match, alerting police, escalating suspected abduction).

**Edge cases acknowledged but not fully solved in a hackathon:** child abduction before last-seen, deliberate abandonment of dependents. Modeled only as an *escalation flag → route-to-police* path.

---

## 3. The datasets

Located in `data/`. **Note:** the user will upload **revised KML files** with more accurate geo data — those become the authoritative geo source; the CSVs below are the current fallback. The loader must parse KML (zone polygons + point placemarks) in addition to CSV.

### 3.1 `Synthetic_Missing_Persons_2500.csv` — the live/transactional data
2,500 **synthetic** records (no real PII), modeled on real Kumbh patterns.

Fields: `case_id, reported_at, missing_person_name, gender, age_band, state, district, language, last_seen_location, reporting_center, reporter_mobile, physical_description, status, resolution_hours, is_duplicate_report, remarks`

### 3.2 Static geographic backbone (constant)
| File | Rows | Fields | Notes |
|---|---|---|---|
| `CCTV_Locations.csv` | ~1,280 | `camera_id, longitude, latitude` | Cameras across 32 zones (`Z{zone}-C{n}`). GPS only, no footage. |
| `Zone_Boundaries.csv` | 32 | `zone_name, centroid_lat, centroid_lng, approx_boundary_points` | Admin zones; `Zone Area N`. |
| `Police_Stations.csv` | 14 | `station_name, longitude, latitude` | **Real** locations. |
| `Chokepoints_Parking.csv` | 85 | `location_name, category, longitude, latitude` | **Real**. Categories below. |

Chokepoint category breakdown: 26 traffic choke points, 11 transfer nodes, 3 no-vehicle pressure zones, 30 parking, 10 outer parking, 5 parking belts. These mark where crowd density peaks and separations cluster.

Geographic extent (Nashik): lat ≈ 19.90–20.08, lng ≈ 73.71–73.88.

---

## 4. Data analysis — real numbers (computed from the 2,500 records)

Use these directly; no need to recompute. **These power the value pitch.**

- **Total:** 2,500 reports.
- **Status:** Reunited 2,150 (**86.0%**) · Pending 210 (8.4%) · Transferred to hospital 73 (2.9%) · **Unresolved 67 (2.7%)**.
- **Time-to-reunite (`resolution_hours`, n=2,124):** mean **4.00h**, **median 2.70h**, **max 28.9h**. → Most resolve fast; the pain is the **long tail**.
- **Age skew (the at-risk group):** largest single band is **61–70 (697, 28%)**. **61+ total = 1,454 (≈58%)** (61–70: 697, 71–80: 532, 80+: 225). 0–12: 201, 13–17: 87, 18–40: 252, 41–60: 506.
- **Sparsity (no clean join key):** **no name 371 (≈15%)**, **no mobile 492 (≈20%)**, no physical description 105 (≈4%).
- **Cross-center duplicates:** `is_duplicate_report=True` for **202 (≈8%)** — the same person reported at multiple centers. *This is the literal "Center A invisible to Center B" gap, present in the data.*
- **Languages:** 10 (Hindi 271, Bengali 261, Kannada 261, Maithili 256, Gujarati 250, Telugu 248, Bhojpuri 245, Awadhi 241, + 2 more). Matching must cross scripts/transliterations.
- **Origin:** 20 states.
- **Reporting centers:** 10 — Adgaon Kho-Ya-Paya, Rajur Bahula Center, Panchavati Center, Ramkund Kho-Ya-Paya Kendra, Bharat Bharati Control Room, Trimbakeshwar Kho-Ya-Paya Kendra, Central Control Room, Nashik Road Center, Sadhugram Lost Found, Police Main Control Room.
- **Last-seen locations:** 20 distinct — top: Madsangvi Transit, Sadhugram Gate 2, Ramkund Ghat, Nashik Road Station, Trimbak Road, Gauri Patangan, Dasak Ghat, Adgaon Parking, Nandur Ghat, Laxmi Narayan Ghat, Takli Sangam, Bus Stand Nashik.
- **Temporal:** reports spike **4–5x on Amrit Snan days**. Busiest sample days: 2027-07-29 (78), 2027-08-08 (71), 2027-08-04 (70), 2027-07-16 (69), 2027-08-14 (67). (Reporting window spans July–August 2027.)

### Data quirks / gotchas (design around these)
1. **There is NO "found person" table.** All 2,500 records are **seeker-side** (a family reporting someone missing). The true reunification match is *found person ↔ missing report*. For a matching demo, synthesize "found-person" records (sample reports, re-represent as found-at-center with degraded fields) to create realistic match pairs.
2. **`physical_description` is templated and often contradicts other fields** (e.g. a "Female" record described as "Man in saffron kurta"). Treat description as noisy/low-trust — never a primary key.
3. **No crowd-density feed exists.** Any congestion/risk angle must be derived (the missing-person report-rate is the only temporal signal and serves as a *proxy* for crowd stress).

---

## 5. Locked decisions

| Decision | Choice |
|---|---|
| **What matters most** | A **crazy-good value pitch** that is also a *working* build. Optimize for an impressive, reliable live demo with Claude doing real reasoning (not faked). |
| **v1 scope** | Operational core only: **COP + Beacon + Reunify + Seeker** (+ DPDP-lite woven in). |
| **Pilgrim channel** | **Simulated WhatsApp/SMS thread + QR→no-login web form.** No real Meta API. |
| **Congestion/VaR data** | (Roadmap.) When built: **report-rate as a crowd-stress proxy**, honestly framed as a leading indicator — not true density. |
| **Copilot autonomy** | **Tiered**: auto low-risk (dedupe, geo-routing); human-approved high-stakes (confirm match, alert police, escalate). |
| **AI** | **Pre-trained Claude** via API (README: do not train from scratch). Latest model. Key server-side. Include a heuristic fallback so the app runs without a key. |
| **UI** | Designed **fresh via the frontend-design skill** — modern, distinctive ops/command-center aesthetic. The earlier `problem-space.html` palette is context only, NOT the identity. |
| **Stack** | React + Vite + TypeScript + Tailwind + react-leaflet; thin Python/FastAPI backend (data seeding + Claude proxy); in-memory Python store with an optional SQLite path. All local — nothing to provision. |

---

## 6. Scope: v1 vs roadmap

**v1 (build now):**
1. **COP** — Common Operating Picture: bird's-eye Leaflet map of Nashik, toggleable static layers + live cases, zone→case drill-down.
2. **Beacon** — multi-channel intake (simulated WhatsApp/SMS + QR web form + operator/kiosk); Claude normalizes/translates/extracts; geo-resolves to nearest CCTV/police/chokepoint.
3. **Reunify (hero)** — Claude cross-center entity resolution with confidence + rationale; auto-merge duplicates; human-approve reunification matches.
4. **Seeker** — no-login `/track/:caseId` status page, no PII.
5. **DPDP-lite** (cross-cutting) — PII stored separately + masked by default; consent at intake; auto-purge on case close.

**Roadmap (pitch as the vision; architecture leaves seams; not built in v1):**
- **Copilot** — full NL ops assistant with tiered autonomous actions (drafting PA announcements/shift briefs, routing, escalation).
- **Foresight** — proactive congestion risk using **VaR / Expected-Shortfall** on the report-rate stress series; worst-case zone ranking; pre-positioning briefs.

---

## 7. Judging criteria (design to all five)
1. **Deployability** — could this run at 80M scale?
2. **Real-world fit** — does it solve a real failure?
3. **UX** — works for phoneless, non-literate users?
4. **System design** — offline, duplicate, incomplete data?
5. **Responsible data handling** — privacy by design (DPDP)?

---

## 8. The value pitch (quantified)
- **Today:** time-to-reunite median 2.7h but **tail to 29h**; **2.7% unresolved**; **8% cross-center duplicates invisible**; everything manual; no cross-center search.
- **With Setu:** cross-center matching **collapses the 8% duplicate noise** and **shrinks the unresolved tail + time-to-match**; **app-free** reaches the ~99.998% the 2025 app missed; **layer on existing infra + pre-trained Claude** → low cost, scales, offline-capable intake with sync; transparent to families; responsible with data.

---

## 9. Demo arc (3 acts, v1)
1. **Bird's-eye (COP):** open map — all four static layers + active cases; drill into a ghat zone → its open cases. *"One screen, every center, finally."*
2. **Core (Beacon→Reunify):** daughter texts "lost father, ~75, Maithili, near Ramkund" → Claude normalizes + geo-resolves (nearest CCTV cluster + Bhadrakali station) → creates case → instantly surfaces **94% match** to a found elderly man logged at a *different* center 20 min earlier, with rationale → ops approves → both notified.
3. **Trust (Seeker + DPDP):** seeker's `/track` link flips to **Reunited** (stage + generic location, no PII); on close, PII **auto-purges**; ops UI shows PII masked by default.

---

## 10. Reference assets (orientation only — not to be copied wholesale)
- `problem-space.html` — earlier interactive problem-space explorer (decision tool). Useful for **problem framing**, not the visual identity.
- `kumbh-data-visualization-by-gpt.html` — Folium/Leaflet map proving the geo data plots correctly on real Nashik coords with layered controls. Reuse the **coordinate-plotting approach** (Leaflet + per-category layers).
- `README.md` — original problem statement + dataset dictionary.
- `data/*.csv` — current seed data.

---

## 11. Environment notes
- Node v24, npm v11 available.
- `ANTHROPIC_API_KEY` is **not** set — read from a `.env`; the user supplies it for live Claude calls. Build a heuristic fallback matcher so the app runs/tests without a key.
