"use client";

import { Copy } from "lucide-react";
import type { SearchQuery } from "@/types/localization";

export function SearchQueryList({ queries }: { queries: SearchQuery[] }) {
  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text)]">Generated queries</h2>
      {queries.length ? (
        <div className="mt-4 grid gap-2">
          {queries.map((query) => (
            <button
              className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-left text-sm text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
              key={query.query_id}
              onClick={() => void navigator.clipboard.writeText(query.query)}
              type="button"
            >
              <span>{query.query}</span>
              <Copy aria-hidden="true" className="h-4 w-4 shrink-0 text-[color:var(--muted)]" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--muted)]">No map queries were generated.</p>
      )}
    </section>
  );
}

