"use client";

import dynamic from "next/dynamic";
import type { CandidateLocation, EventHint } from "@/types/localization";

const LeafletMap = dynamic(
  () => import("@/components/localization/LeafletMap").then((module) => module.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center bg-[color:var(--surface-subtle)] text-sm text-[color:var(--muted)]">
        Loading map
      </div>
    ),
  },
);

export function LocationMap({
  locations,
  eventHint,
}: {
  locations: CandidateLocation[];
  eventHint: EventHint;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)]">
      <div className="border-b border-[color:var(--line)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">Allowed-zone map</h2>
      </div>
      <LeafletMap eventHint={eventHint} locations={locations} />
    </section>
  );
}
