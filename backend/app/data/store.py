"""In-memory store, seeded at boot. All-local so the demo can't break on a DB
(PLAN.md §1). A process-global singleton; fine for a single-node hackathon demo."""
from __future__ import annotations

import threading
from datetime import datetime, timezone

from app.data import seed
from app.data.geo_loader import load_geo
from app.models import Case, FoundPerson, Geo


class Store:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.geo: Geo = load_geo()
        self.rows = seed.load_rows()
        self.stats = seed.compute_stats(self.rows)
        self.cases: dict[str, Case] = {}
        self.found: dict[str, FoundPerson] = {}
        self.audit: list[dict[str, str]] = []
        for c in seed.build_cases(self.rows, self.geo):
            self.cases[c.id] = c
        for f in seed.build_found(self.rows, self.geo, list(self.cases.values())):
            self.found[f.id] = f
        self._seq = 0

    def next_case_id(self) -> str:
        with self._lock:
            self._seq += 1
            return f"KMP-LIVE-{self._seq:04d}"

    def add_case(self, case: Case) -> None:
        with self._lock:
            self.cases[case.id] = case
            self._record("case.created", case.id)

    def unmatched_found(self) -> list[FoundPerson]:
        return [f for f in self.found.values() if not f.matchedCaseId]

    def link(self, case_id: str, found_id: str) -> tuple[Case, FoundPerson]:
        """Confirm a reunification: link both sides and advance the case."""
        with self._lock:
            c = self.cases.get(case_id)
            f = self.found.get(found_id)
            if not c or not f:
                raise KeyError("Case or found record not found")
            if c.linkedFoundId and c.linkedFoundId != found_id:
                raise ValueError("Case is already linked to another found-person record")
            if f.matchedCaseId and f.matchedCaseId != case_id:
                raise ValueError("Found-person record is already linked to another case")
            c.linkedFoundId = found_id
            c.status = "Reunited"
            f.matchedCaseId = case_id
            self._record("reunion.confirmed", case_id, found_id)
            return c, f

    def purge_pii(self, case_id: str) -> None:
        """DPDP auto-purge on close (PLAN.md §2.5)."""
        with self._lock:
            c = self.cases.get(case_id)
            if c:
                if c.status != "Reunited":
                    raise ValueError("Only reunited cases can be closed and purged")
                if c.pii.purgedAt:
                    return
                c.pii.name = None
                c.pii.mobile = None
                c.pii.photoUrl = None
                c.pii.physicalDescription = None
                c.pii.purgedAt = datetime.now(timezone.utc).isoformat(timespec="seconds")
                self._record("pii.purged", case_id)

    def record_reveal(self, case_id: str) -> None:
        with self._lock:
            self._record("pii.revealed", case_id)

    def _record(self, action: str, case_id: str, found_id: str = "") -> None:
        self.audit.append(
            {
                "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "action": action,
                "caseId": case_id,
                "foundId": found_id,
            }
        )


_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store
