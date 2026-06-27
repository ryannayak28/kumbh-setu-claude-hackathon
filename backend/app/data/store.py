"""In-memory store, seeded at boot. All-local so the demo can't break on a DB
(PLAN.md §1). A process-global singleton; fine for a single-node hackathon demo."""
from __future__ import annotations

import threading

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

    def unmatched_found(self) -> list[FoundPerson]:
        return [f for f in self.found.values() if not f.matchedCaseId]

    def link(self, case_id: str, found_id: str) -> None:
        """Confirm a reunification: link both sides and advance the case."""
        with self._lock:
            c = self.cases.get(case_id)
            f = self.found.get(found_id)
            if c and f:
                c.linkedFoundId = found_id
                c.status = "Reunited"
                f.matchedCaseId = case_id

    def purge_pii(self, case_id: str) -> None:
        """DPDP auto-purge on close (PLAN.md §2.5)."""
        from datetime import datetime, timezone

        with self._lock:
            c = self.cases.get(case_id)
            if c:
                c.pii.name = None
                c.pii.mobile = None
                c.pii.photoUrl = None
                c.pii.physicalDescription = None
                c.pii.purgedAt = datetime.now(timezone.utc).isoformat(timespec="seconds")


_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store
