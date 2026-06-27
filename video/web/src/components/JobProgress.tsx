import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { percent } from "@/lib/format";
import type { JobStatus } from "@/types/api";

const countLabels: Record<keyof JobStatus["counts"], string> = {
  sampled_frames: "Sampled frames",
  person_crops: "Person crops",
  contact_sheets: "Contact sheets",
  scored_sheets: "Scored sheets",
  results: "Final candidates",
};

export function JobProgress({ job }: { job: JobStatus }) {
  const terminal = job.status === "done" || job.status === "error";
  const Icon = job.status === "done" ? CheckCircle2 : job.status === "error" ? XCircle : terminal ? Clock : Loader2;

  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon
              aria-hidden="true"
              className={job.status === "done" ? "h-5 w-5 text-[color:var(--accent)]" : job.status === "error" ? "h-5 w-5 text-rose-500" : "h-5 w-5 animate-spin text-[color:var(--accent)]"}
            />
            <p className="text-sm font-semibold capitalize text-[color:var(--text)]">{job.status}</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{job.stage}</h1>
        </div>
        <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[color:var(--text)]">
          {percent(job.progress)}
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[color:var(--surface-subtle)]">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-all duration-500"
          style={{ width: percent(job.progress) }}
        />
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-5">
        {(Object.keys(countLabels) as Array<keyof JobStatus["counts"]>).map((key) => (
          <div key={key} className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] p-3">
            <dt className="text-xs text-[color:var(--muted)]">{countLabels[key]}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[color:var(--text)]">
              {job.counts[key] ?? 0}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

