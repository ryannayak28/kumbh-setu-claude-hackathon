"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getJob, getResults } from "@/lib/api";
import { ErrorBox } from "@/components/ErrorBox";
import { JobProgress } from "@/components/JobProgress";
import { ResultGrid } from "@/components/ResultGrid";
import type { JobStatus, ResultsResponse } from "@/types/api";

export function JobClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedResultsFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const status = await getJob(jobId);
        if (cancelled) {
          return;
        }
        setJob(status);
        setError(null);

        if (status.status === "done") {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          if (fetchedResultsFor.current !== jobId) {
            const response = await getResults(jobId);
            if (!cancelled) {
              setResults(response);
              fetchedResultsFor.current = jobId;
            }
          }
        }

        if (status.status === "error" && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not read job status.");
        }
      }
    }

    void poll();
    interval = setInterval(() => void poll(), 1500);

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  return (
    <main className="min-h-[100dvh] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface-subtle)] active:translate-y-px"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            New search
          </Link>
          <div className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Polling every 1.5 seconds
          </div>
        </header>

        {error ? <ErrorBox title="Could not load job" message={error} /> : null}

        {job ? (
          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <aside className="grid content-start gap-5">
              <JobProgress job={job} />
              {job.status === "error" && job.error ? (
                <ErrorBox message={`Processing failed: ${job.error}`} />
              ) : null}
              <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                <h2 className="text-sm font-semibold text-[color:var(--text)]">Job details</h2>
                <dl className="mt-3 grid gap-3 text-sm">
                  <div>
                    <dt className="text-[color:var(--muted)]">Job ID</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-[color:var(--text)]">{job.job_id}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Created</dt>
                    <dd className="mt-1 text-[color:var(--text)]">{new Date(job.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Updated</dt>
                    <dd className="mt-1 text-[color:var(--text)]">{new Date(job.updated_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </section>
            </aside>
            <ResultGrid response={results} />
          </div>
        ) : (
          <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center text-[color:var(--muted)]">
            Loading job status
          </div>
        )}
      </div>
    </main>
  );
}
