"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Film, LocateFixed, Play } from "lucide-react";
import { ErrorBox } from "@/components/ErrorBox";
import { CandidateLocationList } from "@/components/localization/CandidateLocationList";
import { ClueList } from "@/components/localization/ClueList";
import { EventHintForm } from "@/components/localization/EventHintForm";
import { EvidenceFrameStrip } from "@/components/localization/EvidenceFrameStrip";
import { LocationMap } from "@/components/localization/LocationMap";
import { LocalizationStatus } from "@/components/localization/LocalizationStatus";
import { SearchQueryList } from "@/components/localization/SearchQueryList";
import { assetUrl, getResults } from "@/lib/api";
import { getLocalization, startLocalization } from "@/lib/localizationApi";
import type { SearchResult } from "@/types/api";
import type { EventHint, LocalizationResult } from "@/types/localization";

const defaultEventHint: EventHint = {
  event_name: "Nashik-Trimbakeshwar Simhastha",
  city: "Nashik / Trimbakeshwar",
  country: "India",
  approx_center: { lat: 19.9696921, lng: 73.6616225 },
  search_radius_m: 35000,
  extra_keywords: [
    "ramkund",
    "godaghat",
    "godavari",
    "panchavati",
    "kushawarta",
    "kushavart",
    "trimbak",
    "trimbakeshwar",
    "brahmagiri",
  ],
};

export function LocalizationPage({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  const [eventHint, setEventHint] = useState<EventHint>(defaultEventHint);
  const [candidate, setCandidate] = useState<SearchResult | null>(null);
  const [localizationId, setLocalizationId] = useState<string | null>(null);
  const [result, setResult] = useState<LocalizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getResults(jobId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setCandidate(response.results.find((item) => item.crop_id === candidateId) ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load candidate.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId, jobId]);

  async function handleStart() {
    setError(null);
    setIsStarting(true);
    setResult(null);
    try {
      const started = await startLocalization(jobId, candidateId, {
        window_before_sec: 60,
        window_after_sec: 60,
        sample_fps: 1.0,
        event_hint: eventHint,
      });
      setLocalizationId(started.localization_id);
      const firstStatus = await getLocalization(jobId, started.localization_id);
      setResult(firstStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start localization.");
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    if (!localizationId) {
      return;
    }
    const activeLocalizationId = localizationId;
    let cancelled = false;
    let interval: number | null = null;

    async function poll() {
      try {
        const next = await getLocalization(jobId, activeLocalizationId);
        if (cancelled) {
          return;
        }
        setResult(next);
        if (next.status === "completed" || next.status === "failed") {
          if (interval) {
            window.clearInterval(interval);
            interval = null;
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Polling failed.");
        }
      }
    }

    void poll();
    interval = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [jobId, localizationId]);

  const activeHint = result?.event_hint ?? eventHint;
  const locations = result?.candidate_locations ?? [];
  const warnings = useMemo(() => {
    const debug = result?.debug;
    const raw = debug && Array.isArray(debug.warnings) ? debug.warnings : [];
    return raw.filter((item): item is string => typeof item === "string");
  }, [result]);

  return (
    <main className="min-h-[100dvh] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface-subtle)] active:translate-y-px"
            href={`/jobs/${jobId}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to candidates
          </Link>
          <div className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <LocateFixed aria-hidden="true" className="h-4 w-4" />
            Location Breadcrumbs
          </div>
        </header>

        <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[color:var(--muted)]">Candidate</p>
              <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text)]">{candidateId}</h1>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {candidate
                  ? `${candidate.timestamp_label} · score ${candidate.score}`
                  : "Waiting for candidate details"}
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isStarting}
              onClick={handleStart}
              type="button"
            >
              <LocateFixed aria-hidden="true" className="h-4 w-4" />
              {isStarting ? "Starting" : "Localize This Sighting"}
            </button>
          </div>
        </section>

        {error ? <ErrorBox title="Localization issue" message={error} /> : null}

        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <aside className="grid content-start gap-5">
            <EventHintForm onChange={setEventHint} value={eventHint} />
            <SightingPreview candidate={candidate} result={result} />
            {result ? <LocalizationStatus result={result} /> : null}
            {warnings.length ? (
              <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                <h2 className="text-sm font-semibold text-[color:var(--text)]">Warnings</h2>
                <div className="mt-3 grid gap-2 text-sm leading-6 text-[color:var(--muted)]">
                  {warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>

          {result?.status === "completed" ? (
            <div className="grid gap-5">
              <div className="grid gap-5 2xl:grid-cols-[1fr_420px]">
                <div className="grid gap-5">
                  <EvidenceFrameStrip frames={result.evidence_frames} />
                  <ClueList clues={result.extracted_clues} />
                  <SearchQueryList queries={result.search_queries} />
                </div>
                <div className="grid content-start gap-5">
                  <LocationMap eventHint={activeHint} locations={locations} />
                  <CandidateLocationList locations={locations} />
                </div>
              </div>
            </div>
          ) : (
            <section className="grid min-h-80 place-items-center rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center">
              <div>
                <Film aria-hidden="true" className="mx-auto h-8 w-8 text-[color:var(--accent)]" />
                <h2 className="mt-4 text-lg font-semibold text-[color:var(--text)]">Ready for context extraction</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
                  Start localization to extract nearby frames, OCR signs, and rank possible zones inside the Nashik Godavari/Kushawarta geofence.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function SightingPreview({
  candidate,
  result,
}: {
  candidate: SearchResult | null;
  result: LocalizationResult | null;
}) {
  const clipUrl = result?.sighting?.clip_url ?? candidate?.clip_url ?? null;
  const imageUrl = result?.sighting?.thumbnail_url ?? candidate?.thumbnail_url ?? null;

  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <Play aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
        <h2 className="text-sm font-semibold text-[color:var(--text)]">Sighting media</h2>
      </div>
      {clipUrl ? (
        <video className="mt-4 aspect-video w-full rounded-md border border-[color:var(--line)] bg-black" controls src={assetUrl(clipUrl)} />
      ) : imageUrl ? (
        <img
          alt={candidate?.crop_id ?? "Candidate sighting"}
          className="mt-4 aspect-[3/4] w-full rounded-md border border-[color:var(--line)] object-cover"
          src={assetUrl(imageUrl)}
        />
      ) : (
        <p className="mt-3 text-sm text-[color:var(--muted)]">Candidate media will appear when the result record is available.</p>
      )}
    </section>
  );
}
