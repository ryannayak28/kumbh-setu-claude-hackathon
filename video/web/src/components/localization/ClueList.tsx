import { MapPinned } from "lucide-react";
import type { LocationClue } from "@/types/localization";

export function ClueList({ clues }: { clues: LocationClue[] }) {
  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text)]">Extracted clues</h2>
      {clues.length ? (
        <div className="mt-4 grid gap-3">
          {clues.map((clue) => (
            <article
              className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] p-3"
              key={clue.clue_id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPinned aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
                  <h3 className="font-semibold text-[color:var(--text)]">{clue.value}</h3>
                </div>
                <span className="rounded-full bg-[color:var(--surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]">
                  {Math.round(clue.confidence * 100)}%
                </span>
              </div>
              <p className="mt-2 text-xs uppercase text-[color:var(--muted)]">{clue.type.replaceAll("_", " ")}</p>
              {clue.why_it_matters ? (
                <p className="mt-2 text-sm leading-6 text-[color:var(--text)]">{clue.why_it_matters}</p>
              ) : null}
              <p className="mt-2 font-mono text-xs text-[color:var(--muted)]">
                {clue.timestamp_mmss ?? "context"} · {clue.frame_ids.join(", ")}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--muted)]">No location clues were extracted.</p>
      )}
    </section>
  );
}

