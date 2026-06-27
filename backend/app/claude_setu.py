"""Setu's AI spine (PLAN.md §3): normalize/extract messy intake, and rank
cross-center match candidates with confidence + human-readable rationale.

Pre-trained Claude via the Anthropic API; a deterministic heuristic fallback runs
when no key is set, so the app always works (CONTEXT §11)."""
from __future__ import annotations

import json
import os
import re

import anthropic

from app.config import MODEL
from app.models import Case, FoundPerson, MatchCandidate


def _client() -> anthropic.Anthropic | None:
    key = os.environ.get("ANTHROPIC_API_KEY")
    return anthropic.Anthropic(api_key=key) if key else None


def _json_block(text: str):
    """Pull the first JSON object/array out of a model response."""
    m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    return json.loads(m.group(1)) if m else None


# --- 1. Extraction / normalization --------------------------------------

_AGE_BANDS = ["0-12", "13-17", "18-40", "41-60", "61-70", "71-80", "80+"]
_KNOWN_LANGS = ["Hindi", "Bengali", "Kannada", "Maithili", "Gujarati", "Telugu",
                "Bhojpuri", "Awadhi", "Marathi", "Tamil", "Odia", "Punjabi"]
_KNOWN_LOCATIONS = [
    "Sadhugram Gate 2",
    "Nashik Road Station",
    "Madsangvi Transit",
    "Ramkund Ghat",
    "Trimbak Road",
    "Gauri Patangan",
    "Dasak Ghat",
    "Adgaon Parking",
    "Nandur Ghat",
    "Laxmi Narayan Ghat",
    "Takli Sangam",
    "Bus Stand Nashik",
]


def heuristic_extract(raw: str) -> dict:
    raw_l = (raw or "").lower()
    out: dict = {}
    # Age → band
    m = re.search(r"(\d{1,3})\s*(?:years|yrs|yo|y/o|year)?", raw_l)
    if m:
        age = int(m.group(1))
        if age <= 12: band = "0-12"
        elif age <= 17: band = "13-17"
        elif age <= 40: band = "18-40"
        elif age <= 60: band = "41-60"
        elif age <= 70: band = "61-70"
        elif age <= 80: band = "71-80"
        else: band = "80+"
        out["ageBand"] = band
    if any(w in raw_l for w in ["father", "grandfather", "husband", "son", "uncle", "man", "male", "baba", "dada", "papa", "pitaji"]):
        out["gender"] = "Male"
    elif any(w in raw_l for w in ["mother", "grandmother", "wife", "daughter", "aunt", "woman", "female", "maa", "amma"]):
        out["gender"] = "Female"
    for lang in _KNOWN_LANGS:
        if lang.lower() in raw_l:
            out["language"] = lang
            break
    # Prefer known operational landmarks, including common shortened forms in
    # transliterated messages ("Ramkund ke paas", "... er kachhe").
    for location in _KNOWN_LOCATIONS:
        canonical = location.lower()
        short = canonical.replace(" ghat", "").replace(" station", "")
        if canonical in raw_l or (len(short) >= 6 and short in raw_l):
            out["lastSeenLocation"] = location
            break
    if "lastSeenLocation" not in out:
        m = re.search(r"(?:near|at|around|by)\s+([a-z][a-z\s]{2,30})", raw_l)
        if m:
            out["lastSeenLocation"] = m.group(1).strip().title()
    return out


def extract(raw: str) -> tuple[dict, str]:
    """Return (fields, 'claude'|'heuristic'). Fields: gender, ageBand, language,
    lastSeenLocation, name (best-effort)."""
    client = _client()
    if not client or not raw:
        return heuristic_extract(raw), "heuristic"
    try:
        prompt = (
            "You are an intake normalizer for a missing-person desk at the Nashik "
            "Kumbh Mela. Extract structured fields from a family member's free-text "
            "report (any Indian language or transliteration). Return ONLY JSON with "
            "keys: name (string|null), gender ('Male'|'Female'|'Unknown'), ageBand "
            f"(one of {_AGE_BANDS}), language (string|null, the missing person's "
            "language), lastSeenLocation (string|null, a place name).\n\n"
            f"Report: {raw!r}"
        )
        msg = client.messages.create(
            model=MODEL, max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        data = _json_block(msg.content[0].text) or {}
        baseline = heuristic_extract(raw)
        # Merge over the deterministic baseline so we never lose a field the
        # model skipped. Prefer the canonical operational landmark name when
        # the model returns only a shortened form such as "Ramkund".
        merged = {**baseline, **{k: v for k, v in data.items() if v}}
        canonical_location = baseline.get("lastSeenLocation")
        model_location = data.get("lastSeenLocation")
        if canonical_location and model_location:
            a, b = canonical_location.lower(), str(model_location).lower()
            if a in b or b in a:
                merged["lastSeenLocation"] = canonical_location
        return merged, "claude"
    except Exception:
        return heuristic_extract(raw), "heuristic"


# --- 2. Cross-center match ranking (the hard, defensible core) ----------

_ADJ = {b: i for i, b in enumerate(_AGE_BANDS)}


def _loc_overlap(a: str, b: str) -> float:
    a, b = (a or "").lower(), (b or "").lower()
    if not a or not b:
        return 0.0
    if a in b or b in a:
        return 1.0
    ta, tb = set(a.split()), set(b.split())
    inter = ta & tb
    return len(inter) / max(1, min(len(ta), len(tb))) if inter else 0.0


def _name_overlap(case_name: str | None, approx: str | None) -> float:
    if not case_name or not approx:
        return 0.0
    cn = re.sub(r"[^a-z]", "", case_name.lower().split(" ")[0])
    ap = re.sub(r"[^a-z?]", "", approx.lower().split(" ")[0])
    if not cn or not ap:
        return 0.0
    ap = ap.replace("?", "")
    if not ap:
        return 0.0
    return 1.0 if (cn.startswith(ap) or ap.startswith(cn)) else 0.0


def heuristic_match(case: Case, found: list[FoundPerson]) -> list[MatchCandidate]:
    out: list[MatchCandidate] = []
    for f in found:
        fields: list[str] = []
        score = 0.0
        if case.gender != "Unknown" and f.gender != "Unknown":
            if case.gender == f.gender:
                score += 0.15; fields.append("gender")
            else:
                score -= 0.25  # opposite gender strongly disqualifies
        if case.ageBand and f.ageBand:
            d = abs(_ADJ.get(case.ageBand, 0) - _ADJ.get(f.ageBand, 0))
            if d == 0:
                score += 0.22; fields.append("ageBand")
            elif d == 1:
                score += 0.10
        if case.language and f.language and case.language.lower() == f.language.lower():
            score += 0.26; fields.append("language")
        loc = _loc_overlap(case.lastSeenLocation, f.observedLocation)
        if loc >= 0.99:
            score += 0.27; fields.append("location")
        elif loc > 0:
            score += 0.13 * loc
        nm = _name_overlap(case.pii.name, f.approxName)
        if nm > 0:
            score += 0.12; fields.append("name")
        # Cross-center bonus: the whole point is A↔B visibility.
        if f.center and case.reportingCenter and f.center != case.reportingCenter:
            score += 0.03
        score = max(0.0, min(0.99, score))
        if score < 0.25:
            continue
        rationale = _heuristic_rationale(case, f, fields)
        out.append(MatchCandidate(foundId=f.id, score=round(score, 2), rationale=rationale,
                                  fieldsMatched=fields, tier="review", found=f))
    out.sort(key=lambda c: c.score, reverse=True)
    return out[:5]


def _heuristic_rationale(case: Case, f: FoundPerson, fields: list[str]) -> str:
    bits = []
    if "gender" in fields and "ageBand" in fields:
        bits.append(f"both {case.gender.lower()}, age {case.ageBand}")
    if "language" in fields:
        bits.append(f"same language ({case.language})")
    if "location" in fields:
        bits.append(f"last-seen and found-at overlap ({case.lastSeenLocation})")
    if f.center != case.reportingCenter:
        bits.append(f"logged at a different center ({f.center}) — exactly the cross-center gap")
    return "Strong match: " + "; ".join(bits) + "." if bits else "Possible match on partial fields."


def match(case: Case, found: list[FoundPerson]) -> tuple[list[MatchCandidate], str]:
    """Rank found-person candidates for a missing-person case. Returns (cands, engine)."""
    client = _client()
    if not client or not found:
        return heuristic_match(case, found), "heuristic"
    try:
        cand_payload = [
            {"foundId": f.id, "gender": f.gender, "ageBand": f.ageBand,
             "language": f.language, "observedLocation": f.observedLocation,
             "center": f.center, "approxName": f.approxName, "note": f.note}
            for f in found
        ]
        case_payload = {
            "gender": case.gender, "ageBand": case.ageBand, "language": case.language,
            "lastSeenLocation": case.lastSeenLocation, "reportingCenter": case.reportingCenter,
            "name": case.pii.name, "physicalDescription": case.pii.physicalDescription,
        }
        prompt = (
            "You are the entity-resolution engine for Setu, a missing-person "
            "reunification system at the Nashik Kumbh Mela (80M pilgrims, 10 "
            "languages, sparse/partial records, no clean join key). Match a NEW "
            "missing-person report (family's side) against FOUND-person records "
            "logged across different centers.\n"
            "Rules: physical_description is templated and often CONTRADICTS other "
            "fields — treat it as low-trust, never decisive. Opposite gender "
            "strongly disqualifies. Same language + overlapping location + matching "
            "age band across DIFFERENT centers is the strongest signal. Be calibrated.\n"
            "Return ONLY a JSON array (max 5, sorted by score desc) of objects: "
            "{foundId, score (0..1), rationale (one plain sentence an officer can "
            "act on), fieldsMatched (array of field names), tier ('review' for "
            "reunification, 'auto' only if essentially certain)}.\n\n"
            f"NEW REPORT:\n{json.dumps(case_payload, ensure_ascii=False)}\n\n"
            f"FOUND RECORDS:\n{json.dumps(cand_payload, ensure_ascii=False)}"
        )
        msg = client.messages.create(
            model=MODEL, max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        data = _json_block(msg.content[0].text) or []
        by_id = {f.id: f for f in found}
        cands: list[MatchCandidate] = []
        for d in data:
            fid = d.get("foundId")
            if fid not in by_id:
                continue
            cands.append(MatchCandidate(
                foundId=fid, score=round(float(d.get("score", 0)), 2),
                rationale=d.get("rationale", ""), fieldsMatched=d.get("fieldsMatched", []),
                tier="auto" if d.get("tier") == "auto" else "review", found=by_id[fid],
            ))
        # Claude adds multilingual/semantic reasoning, while the deterministic
        # scorer is a safety net: a model response may omit a strong structured
        # match, but it must not make that candidate disappear from operations.
        merged_by_id = {c.foundId: c for c in heuristic_match(case, found)}
        for candidate in cands:
            baseline = merged_by_id.get(candidate.foundId)
            if baseline is None or candidate.score >= baseline.score:
                merged_by_id[candidate.foundId] = candidate
        merged = sorted(merged_by_id.values(), key=lambda c: c.score, reverse=True)
        return merged[:5], "hybrid"
    except Exception:
        return heuristic_match(case, found), "heuristic"
