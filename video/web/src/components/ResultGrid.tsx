import { ResultCard } from "@/components/ResultCard";
import { EmptyState } from "@/components/EmptyState";
import type { ResultsResponse } from "@/types/api";

export function ResultGrid({ response }: { response: ResultsResponse | null }) {
  if (!response) {
    return (
      <EmptyState
        title="Waiting for candidates"
        body="Results appear here when the backend finishes scoring contact sheets and creating clips."
      />
    );
  }

  if (!response.results.length) {
    return (
      <EmptyState
        title="No candidate sightings returned"
        body="Try increasing sample FPS, lowering confidence, or making the appearance description broader."
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Candidate sightings</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          Nearby duplicate sightings are collapsed. Increase sensitivity by reducing dedup window in backend settings.
        </p>
        {response.scoring_provider && response.scoring_model ? (
          <p className="mt-2 text-sm font-medium text-[color:var(--accent-strong)]">
            Scored with {response.scoring_provider} ({response.scoring_model})
          </p>
        ) : null}
        {response.reference_image_url ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">Reference image was included in scoring.</p>
        ) : null}
      </div>
      {response.results.map((result) => (
        <ResultCard key={result.crop_id} jobId={response.job_id} result={result} />
      ))}
    </section>
  );
}
