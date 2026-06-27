import type { CandidateLocation } from "@/types/localization";

export function ConfidenceBadge({ location }: { location: CandidateLocation }) {
  const relationScore = location.zone_relation_score ?? location.confidence;
  const tone =
    location.confidence_label === "likely"
      ? "bg-teal-100 text-teal-950 dark:bg-teal-300/15 dark:text-teal-100"
      : location.confidence_label === "possible"
        ? "bg-amber-100 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100"
        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {location.confidence_label} · relation {Math.round(relationScore * 100)}%
    </span>
  );
}
