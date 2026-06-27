"use client";

import { Copy, ExternalLink, MapPin } from "lucide-react";
import { ConfidenceBadge } from "@/components/localization/ConfidenceBadge";
import { SourceBadge } from "@/components/localization/SourceBadge";
import type { CandidateLocation } from "@/types/localization";

export function CandidateLocationCard({ location }: { location: CandidateLocation }) {
  const coords = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
  const relationScore = location.zone_relation_score ?? location.confidence;

  return (
    <article className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
            <h3 className="font-semibold text-[color:var(--text)]">{location.name}</h3>
          </div>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Possible zone · radius {location.radius_m}m
          </p>
          {location.zone_id ? (
            <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">{location.zone_id}</p>
          ) : null}
        </div>
        <ConfidenceBadge location={location} />
      </div>

      <div className="mt-4 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm text-[color:var(--text)]">
        Zone relation score: {Math.round(relationScore * 100)}%
      </div>

      {location.matched_clues.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-[color:var(--muted)]">Zone-matched clues</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {location.matched_clues.map((clue) => (
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-950 dark:bg-teal-300/15 dark:text-teal-100" key={clue}>
                {clue}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {location.sources.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {location.sources.map((source) => (
            <SourceBadge key={source} source={source} />
          ))}
        </div>
      ) : null}

      {location.uncertainties.length ? (
        <div className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
          {location.uncertainties.map((uncertainty) => (
            <p key={uncertainty}>{uncertainty}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {location.map_url ? (
          <a
            className="inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
            href={location.map_url}
            rel="noreferrer"
            target="_blank"
          >
            Open map
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <button
          className="inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
          onClick={() => void navigator.clipboard.writeText(coords)}
          type="button"
        >
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy coordinates
        </button>
      </div>
    </article>
  );
}
