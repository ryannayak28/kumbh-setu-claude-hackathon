import { useMemo, useState } from 'react'
import {
  Cctv,
  ChevronRight,
  Hexagon,
  Layers3,
  ListFilter,
  Radio,
  Search,
  Shield,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { LayerFlags } from '@/components/SetuMap'
import type { Case, Geo, Stats, Status } from '@/shared/types'
import { COLORS, STATUS_COLOR } from '@/lib/theme'

type RailMode = 'cases' | 'layers'
type CaseFilter = 'Active' | 'Matched' | 'Pending' | 'Unresolved'

const LAYER_DEFS: {
  key: keyof LayerFlags
  label: string
  icon: typeof Cctv
  color: string
  count?: (geo: Geo, cases: Case[]) => number
}[] = [
  { key: 'cases', label: 'Active cases', icon: Radio, color: COLORS.saffron, count: (_, cases) => cases.length },
  { key: 'cctv', label: 'CCTV cameras', icon: Cctv, color: COLORS.teal, count: (geo) => geo.cctv.length },
  { key: 'police', label: 'Police stations', icon: Shield, color: '#7aa2ff', count: (geo) => geo.stations.length },
  { key: 'chokepoints', label: 'Chokepoints', icon: TriangleAlert, color: COLORS.amber, count: (geo) => geo.chokepoints.length },
  { key: 'zones', label: 'Zone boundaries', icon: Hexagon, color: '#7d88aa', count: (geo) => geo.zones.length },
]

const ACTIVE: Status[] = ['Reported', 'Pending', 'Matched', 'Unresolved']

export default function OperationsRail({
  geo,
  stats,
  cases,
  layers,
  selectedCaseId,
  selectedZone,
  onLayersChange,
  onSelectCase,
  onClearZone,
  onClose,
}: {
  geo: Geo | null
  stats: Stats | null
  cases: Case[]
  layers: LayerFlags
  selectedCaseId?: string | null
  selectedZone?: string | null
  onLayersChange: (layers: LayerFlags) => void
  onSelectCase: (c: Case) => void
  onClearZone: () => void
  onClose?: () => void
}) {
  const [mode, setMode] = useState<RailMode>('cases')
  const [filter, setFilter] = useState<CaseFilter>('Active')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return cases
      .filter((c) => {
        if (selectedZone && c.geo.zone !== selectedZone) return false
        if (filter === 'Active' && !ACTIVE.includes(c.status)) return false
        if (filter !== 'Active' && c.status !== filter) return false
        if (!needle) return true
        return [c.id, c.lastSeenLocation, c.reportingCenter, c.language, c.ageBand]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(needle))
      })
      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
  }, [cases, filter, query, selectedZone])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-bg)]">
      <div className="flex items-center border-b border-[var(--color-line)] px-3 pt-3">
        <button
          type="button"
          onClick={() => setMode('cases')}
          className="flex flex-1 items-center justify-center gap-2 border-b-2 px-2 pb-2.5 text-sm font-medium"
          style={{ borderColor: mode === 'cases' ? COLORS.saffron : 'transparent', color: mode === 'cases' ? COLORS.ink : COLORS.inkDim }}
        >
          <ListFilter size={15} /> Cases
        </button>
        <button
          type="button"
          onClick={() => setMode('layers')}
          className="flex flex-1 items-center justify-center gap-2 border-b-2 px-2 pb-2.5 text-sm font-medium"
          style={{ borderColor: mode === 'layers' ? COLORS.teal : 'transparent', color: mode === 'layers' ? COLORS.ink : COLORS.inkDim }}
        >
          <Layers3 size={15} /> Layers
        </button>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close operations panel" className="mb-2 ml-2 rounded-md p-1.5 text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] md:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {mode === 'cases' ? (
        <>
          <div className="space-y-2 border-b border-[var(--color-line)] p-3">
            <label className="relative block">
              <span className="sr-only">Search cases</span>
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Case, place, center, language"
                className="h-9 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] pl-8 pr-3 text-xs text-[var(--color-ink)] outline-none placeholder:text-[#7f89a7] focus:border-[var(--color-teal)]"
              />
            </label>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {(['Active', 'Matched', 'Pending', 'Unresolved'] as CaseFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition"
                  style={{
                    borderColor: filter === value ? COLORS.saffron : COLORS.line,
                    background: filter === value ? 'rgba(255,138,61,0.1)' : 'transparent',
                    color: filter === value ? COLORS.ink : COLORS.inkDim,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            {selectedZone && (
              <div className="flex items-center justify-between rounded-md bg-[var(--color-surface)] px-2.5 py-2 text-xs">
                <span><span className="text-[var(--color-ink-dim)]">Zone:</span> {selectedZone}</span>
                <button type="button" onClick={onClearZone} className="text-[var(--color-teal)] hover:underline">clear</button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length ? (
              visible.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCase(c)}
                  className="flex w-full items-start gap-2.5 border-b border-[var(--color-line-soft)] px-3 py-3 text-left transition hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-teal)]"
                  style={{ background: selectedCaseId === c.id ? COLORS.surface : undefined }}
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[c.status] }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="mono text-[11px] font-semibold text-[var(--color-ink)]">{c.id}</span>
                      <span className="text-[10px]" style={{ color: STATUS_COLOR[c.status] }}>{c.status}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-[var(--color-ink-dim)]">
                      {c.ageBand} · {c.gender} · {c.language || 'language unknown'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-ink)]">{c.lastSeenLocation || c.geo.zone}</span>
                  </span>
                  <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--color-ink-faint)]" />
                </button>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <Search size={20} className="mx-auto mb-2 text-[var(--color-ink-faint)]" />
                <p className="text-sm text-[var(--color-ink)]">No cases match</p>
                <p className="mt-1 text-xs text-[var(--color-ink-dim)]">Clear the search or choose another status.</p>
              </div>
            )}
          </div>

          {stats && (
            <div className="border-t border-[var(--color-line)] p-3 text-xs text-[var(--color-ink-dim)]">
              <span className="font-semibold text-[var(--color-saffron)]">{stats.crossCenterDuplicates}</span> cross-center duplicates in the source data · <span className="text-[var(--color-red)]">{stats.unresolvedPct}%</span> unresolved
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 p-3">
          <p className="mb-2 text-xs leading-relaxed text-[var(--color-ink-dim)]">
            Toggle the infrastructure context behind every report.
          </p>
          <div className="space-y-1">
            {LAYER_DEFS.map((layer) => {
              const enabled = layers[layer.key]
              const Icon = layer.icon
              return (
                <button
                  key={layer.key}
                  type="button"
                  aria-pressed={enabled}
                  onClick={() => onLayersChange({ ...layers, [layer.key]: !enabled })}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition hover:bg-[var(--color-surface)]"
                  style={{ color: enabled ? COLORS.ink : COLORS.inkDim }}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: enabled ? layer.color : COLORS.line, background: enabled ? layer.color : 'transparent' }}>
                    {enabled && <span className="h-1.5 w-1.5 rounded-sm bg-[var(--color-bg)]" />}
                  </span>
                  <Icon size={15} style={{ color: enabled ? layer.color : COLORS.inkDim }} />
                  <span className="flex-1 text-left">{layer.label}</span>
                  {geo && layer.count && <span className="mono text-[10px] text-[var(--color-ink-dim)]">{layer.count(geo, cases)}</span>}
                </button>
              )
            })}
          </div>
          <div className="mt-5 rounded-lg bg-[var(--color-surface)] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink)]">
              <TriangleAlert size={14} className="text-[var(--color-amber)]" />
              Location data is operational context
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-dim)]">
              CCTV markers represent camera locations only. Setu does not ingest footage or perform facial recognition.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
