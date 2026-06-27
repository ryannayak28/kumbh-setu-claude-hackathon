"""Seed the live operational board from Synthetic_Missing_Persons_2500.csv.

The dataset is entirely seeker-side (CONTEXT §4 quirk 1), so we also *synthesize*
found-person records to create realistic reunification pairs — including one
planted high-confidence pair for the Act-2 demo (elderly Maithili man near Ramkund).
"""
from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

from app.config import DATA_DIR, DATA_DIR_FALLBACK, SEED_LIVE_CASES
from app.data import geo as geohelp
from app.models import Case, FoundPerson, Geo, GeoResolution, PII

RNG = random.Random(2027)

_STATUS_MAP = {
    "Reunited": "Reunited",
    "Pending": "Pending",
    "Transferred to hospital": "Transferred",
    "Transferred": "Transferred",
    "Unresolved": "Unresolved",
}


def _missing_csv() -> Path:
    p = DATA_DIR / "Synthetic_Missing_Persons_2500.csv"
    return p if p.exists() else DATA_DIR_FALLBACK / "Synthetic_Missing_Persons_2500.csv"


def load_rows() -> list[dict]:
    with open(_missing_csv(), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def compute_stats(rows: list[dict]) -> dict:
    """Headline numbers that power the value pitch (CONTEXT §4)."""
    n = len(rows)
    from collections import Counter

    status = Counter(r["status"] for r in rows)
    res = [float(r["resolution_hours"]) for r in rows if r.get("resolution_hours")]
    res.sort()
    median = res[len(res) // 2] if res else 0.0
    dup = sum(1 for r in rows if str(r.get("is_duplicate_report")).strip().lower() == "true")
    no_name = sum(1 for r in rows if not (r.get("missing_person_name") or "").strip())
    no_mobile = sum(1 for r in rows if not (r.get("reporter_mobile") or "").strip())
    elderly = sum(1 for r in rows if r.get("age_band") in ("61-70", "71-80", "80+"))
    langs = Counter(r["language"] for r in rows if r.get("language"))
    return {
        "total": n,
        "reunited": status.get("Reunited", 0),
        "pending": status.get("Pending", 0),
        "transferred": status.get("Transferred to hospital", 0),
        "unresolved": status.get("Unresolved", 0),
        "medianHours": round(median, 1),
        "maxHours": round(max(res), 1) if res else 0.0,
        "meanHours": round(sum(res) / len(res), 1) if res else 0.0,
        "crossCenterDuplicates": dup,
        "duplicatePct": round(100 * dup / n, 1) if n else 0,
        "noName": no_name,
        "noMobile": no_mobile,
        "elderly": elderly,
        "elderlyPct": round(100 * elderly / n, 1) if n else 0,
        "languages": len(langs),
        "topLanguages": dict(langs.most_common(6)),
        "unresolvedPct": round(100 * status.get("Unresolved", 0) / n, 1) if n else 0,
    }


def _age_to_approx(age_band: str) -> str:
    return {"0-12": "~8", "13-17": "~15", "18-40": "~30", "41-60": "~50",
            "61-70": "~65", "71-80": "~75", "80+": "~82"}.get(age_band, "?")


def build_cases(rows: list[dict], geo: Geo) -> list[Case]:
    """Pick a slice as the live board: all open cases first, then recent reunited."""
    open_rows = [r for r in rows if r["status"] in ("Pending", "Unresolved", "Transferred to hospital")]
    reunited = [r for r in rows if r["status"] == "Reunited"]
    RNG.shuffle(reunited)
    chosen = open_rows[:SEED_LIVE_CASES] + reunited[: max(0, SEED_LIVE_CASES - len(open_rows))]
    chosen = chosen[:SEED_LIVE_CASES]

    cases: list[Case] = []
    for r in chosen:
        geores = geohelp.resolve(r.get("last_seen_location", ""), geo)
        status = _STATUS_MAP.get(r["status"], "Reported")
        cases.append(
            Case(
                id=r["case_id"],
                reportedAt=r.get("reported_at", ""),
                channel="operator",
                gender=r.get("gender", "Unknown") if r.get("gender") in ("Male", "Female") else "Unknown",
                ageBand=r.get("age_band", "18-40"),
                state=r.get("state") or None,
                district=r.get("district") or None,
                language=r.get("language") or None,
                lastSeenLocation=r.get("last_seen_location", ""),
                reportingCenter=r.get("reporting_center", ""),
                status=status,
                geo=geores,
                pii=PII(
                    name=r.get("missing_person_name") or None,
                    mobile=r.get("reporter_mobile") or None,
                    physicalDescription=r.get("physical_description") or None,
                    consent=True,
                ),
                resolutionHours=float(r["resolution_hours"]) if r.get("resolution_hours") else None,
                remarks=r.get("remarks") or None,
            )
        )
    return cases


def build_found(rows: list[dict], geo: Geo, cases: list[Case]) -> list[FoundPerson]:
    """Synthesize found-desk records. Some are degraded re-representations of *open*
    cases (so Reunify has true positives to surface); plus the planted hero pair."""
    found: list[FoundPerson] = []
    now = datetime(2027, 8, 8, 11, 30)  # a busy Amrit Snan day; demo "clock"

    # The planted Act-2 hero: elderly Maithili man near Ramkund, logged at a DIFFERENT
    # center ~20 min before the daughter's report. Stays unmatched until the demo.
    found.append(
        FoundPerson(
            id="FP-HERO-001",
            foundAt=(now - timedelta(minutes=20)).isoformat(timespec="minutes"),
            center="Ramkund Kho-Ya-Paya Kendra",
            gender="Male",
            ageBand="71-80",
            language="Maithili",
            observedLocation="Ramkund Ghat",
            note="Elderly man, disoriented, saffron shawl & rudraksha mala. Repeats a daughter's name. Speaks Maithili only.",
            approxName="Ram??? (unclear)",
        )
    )

    # Build a handful of true-positive found records from OPEN cases so the board's
    # existing pins have real cross-center candidates waiting.
    open_cases = [c for c in cases if c.status in ("Pending", "Unresolved", "Reported")]
    RNG.shuffle(open_cases)
    centers = list({c.reportingCenter for c in cases if c.reportingCenter})
    for i, c in enumerate(open_cases[:18]):
        # Log them at a *different* center than where the family reported.
        alt = RNG.choice([x for x in centers if x != c.reportingCenter] or centers)
        degrade_name = RNG.random() < 0.5
        found.append(
            FoundPerson(
                id=f"FP-{i+2:03d}",
                foundAt=(now - timedelta(minutes=RNG.randint(15, 240))).isoformat(timespec="minutes"),
                center=alt,
                gender=c.gender,
                ageBand=c.ageBand,
                language=c.language,
                observedLocation=c.lastSeenLocation,
                note=f"Found {_age_to_approx(c.ageBand)} {c.gender.lower()} pilgrim, brought to {alt}.",
                approxName=None if degrade_name else (c.pii.name.split(" ")[0] if c.pii.name else None),
            )
        )

    # A few pure-noise found records (no matching case) — realistic clutter.
    noise_langs = ["Hindi", "Bengali", "Telugu", "Gujarati", "Kannada"]
    for j in range(6):
        found.append(
            FoundPerson(
                id=f"FP-N{j+1:02d}",
                foundAt=(now - timedelta(minutes=RNG.randint(20, 300))).isoformat(timespec="minutes"),
                center=RNG.choice(centers) if centers else "Central Control Room",
                gender=RNG.choice(["Male", "Female"]),
                ageBand=RNG.choice(["18-40", "41-60", "0-12"]),
                language=RNG.choice(noise_langs),
                observedLocation=RNG.choice(["Madsangvi Transit", "Bus Stand Nashik", "Nashik Road Station"]),
                note="Found pilgrim awaiting identification.",
                approxName=None,
            )
        )
    return found
