export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]">
      {source.replaceAll("_", " ")}
    </span>
  );
}

