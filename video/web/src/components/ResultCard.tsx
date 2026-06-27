import { ExternalLink, Film, Image as ImageIcon } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { LocalizeButton } from "@/components/localization/LocalizeButton";
import { scoreLabel } from "@/lib/format";
import type { SearchResult } from "@/types/api";

export function ResultCard({ result, jobId }: { result: SearchResult; jobId: string }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
        <div className="bg-[color:var(--surface-subtle)] p-3">
          <img
            alt={`Candidate crop ${result.crop_id}`}
            className="aspect-[3/4] w-full rounded-md border border-[color:var(--line)] object-cover"
            src={assetUrl(result.thumbnail_url)}
          />
        </div>
        <div className="grid gap-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[color:var(--muted)]">Rank {result.rank}</p>
              <h2 className="mt-1 text-lg font-semibold text-[color:var(--text)]">{result.crop_id}</h2>
            </div>
            <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-right">
              <p className="text-xl font-semibold tabular-nums text-[color:var(--text)]">{result.score}</p>
              <p className="text-xs text-[color:var(--muted)]">{scoreLabel(result.score)}</p>
            </div>
          </div>

          <div>
            <LocalizeButton candidateId={result.crop_id} jobId={jobId} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Film aria-hidden="true" className="h-4 w-4" />
              {result.timestamp_label}
            </span>
            <a
              className="inline-flex items-center gap-1.5 font-semibold text-[color:var(--accent-strong)] hover:underline"
              href={assetUrl(result.frame_url)}
              rel="noreferrer"
              target="_blank"
            >
              <ImageIcon aria-hidden="true" className="h-4 w-4" />
              Open full frame
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="text-sm leading-6 text-[color:var(--text)]">{result.reason}</p>

          <ChipGroup label="Matched" items={result.matched_attributes} tone="match" />
          <ChipGroup label="Unclear" items={result.missing_or_unclear_attributes} tone="muted" />

          {result.clip_url ? (
            <video
              className="mt-1 aspect-video w-full rounded-md border border-[color:var(--line)] bg-black"
              controls
              src={assetUrl(result.clip_url)}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ChipGroup({ label, items, tone }: { label: string; items: string[]; tone: "match" | "muted" }) {
  if (!items.length) {
    return null;
  }
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[color:var(--muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            className={
              tone === "match"
                ? "rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-950 dark:bg-teal-300/15 dark:text-teal-100"
                : "rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
            }
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
