import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import type { LocalizationResult } from "@/types/localization";

export function LocalizationStatus({ result }: { result: LocalizationResult }) {
  const progress = result.progress?.percent ?? (result.status === "completed" ? 100 : 0);
  const Icon =
    result.status === "completed" ? CheckCircle2 : result.status === "failed" ? CircleAlert : Loader2;

  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            aria-hidden="true"
            className={`h-4 w-4 ${result.status === "running" || result.status === "queued" ? "animate-spin" : ""}`}
          />
          <h2 className="text-sm font-semibold text-[color:var(--text)]">
            {result.progress?.message ?? result.status}
          </h2>
        </div>
        <span className="font-mono text-sm text-[color:var(--muted)]">{progress}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--surface-subtle)]">
        <div className="h-full bg-[color:var(--accent)] transition-all" style={{ width: `${progress}%` }} />
      </div>
      {result.error ? (
        <p className="mt-3 text-sm text-red-600">
          {result.error.code}: {result.error.message}
        </p>
      ) : null}
    </section>
  );
}

