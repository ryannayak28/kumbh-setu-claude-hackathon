"use client";

import { MapPin, Search, ShieldCheck } from "lucide-react";
import type { EventHint } from "@/types/localization";

export function EventHintForm({
  value,
  onChange,
}: {
  value: EventHint;
  onChange: (value: EventHint) => void;
}) {
  const center = value.approx_center ?? { lat: 19.9696921, lng: 73.6616225 };

  function update(next: Partial<EventHint>) {
    onChange({ ...value, ...next });
  }

  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
        <h2 className="text-sm font-semibold text-[color:var(--text)]">Nashik zone lock</h2>
      </div>
      <div className="mt-3 grid gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] p-3 text-sm text-[color:var(--text)]">
        <p>Godavari Ramkund corridor</p>
        <p>Kushawarta Kund / Trimbak area</p>
      </div>

      <div className="mt-4 grid gap-3">
        <TextField label="Event" value={value.event_name ?? ""} onChange={(event_name) => update({ event_name })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Search area" value={value.city ?? ""} onChange={(city) => update({ city })} />
          <TextField label="Country" value={value.country ?? ""} onChange={(country) => update({ country })} />
        </div>
        <details className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--text)]">
            Advanced map bias
          </summary>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Center latitude"
                value={center.lat}
                onChange={(lat) => update({ approx_center: { ...center, lat } })}
                step="0.0001"
              />
              <NumberField
                label="Center longitude"
                value={center.lng}
                onChange={(lng) => update({ approx_center: { ...center, lng } })}
                step="0.0001"
              />
            </div>
            <NumberField
              label="Search radius (m)"
              max={100000}
              min={100}
              value={value.search_radius_m}
              onChange={(search_radius_m) => update({ search_radius_m })}
              step="100"
            />
          </div>
        </details>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-[color:var(--text)]">Zone aliases</span>
          <textarea
            className="min-h-20 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-[color:var(--text)]"
            value={value.extra_keywords.join(", ")}
            onChange={(event) =>
              update({
                extra_keywords: event.currentTarget.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
          <Search aria-hidden="true" className="h-3.5 w-3.5" />
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
          <span>
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-[color:var(--text)]">{label}</span>
      <input
        className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-[color:var(--text)]"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-[color:var(--text)]">{label}</span>
      <input
        className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 font-mono text-[color:var(--text)]"
        max={max}
        min={min}
        step={step}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}
