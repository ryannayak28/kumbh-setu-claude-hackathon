import { Search } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center">
      <Search aria-hidden="true" className="mx-auto h-8 w-8 text-[color:var(--accent)]" />
      <h2 className="mt-4 text-lg font-semibold text-[color:var(--text)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">{body}</p>
    </div>
  );
}

