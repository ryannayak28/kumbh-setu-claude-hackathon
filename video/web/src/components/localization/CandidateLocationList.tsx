import { CandidateLocationCard } from "@/components/localization/CandidateLocationCard";
import type { CandidateLocation } from "@/types/localization";

export function CandidateLocationList({ locations }: { locations: CandidateLocation[] }) {
  return (
    <section className="grid gap-3">
      <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">Possible Nashik zones</h2>
        {!locations.length ? (
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            No allowed-zone hypotheses were found, but extracted clues and queries may still be useful.
          </p>
        ) : null}
      </div>
      {locations.map((location) => (
        <CandidateLocationCard key={location.candidate_location_id} location={location} />
      ))}
    </section>
  );
}
