import Link from "next/link";
import { MapPinned } from "lucide-react";

export function LocalizeButton({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface-subtle)] active:translate-y-px"
      href={`/jobs/${jobId}/candidates/${encodeURIComponent(candidateId)}/localize`}
    >
      <MapPinned aria-hidden="true" className="h-4 w-4" />
      Localize This Sighting
    </Link>
  );
}

