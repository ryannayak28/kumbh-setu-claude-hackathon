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
  const counts = useMemo(() => ({
    Active: cases.filter((c) => ACTIVE.includes(c.status)).length,
    Matched: cases.filter((c) => c.status === 'Matched').length,
    Pending: cases.filter((c) => c.status === 'Pending').length,
    Unresolved: cases.filter((c) => c.status === 'Unresolved').length,
  }), [cases])

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
    <div className="surface-sheen flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--color-line)] px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-ink)]">Operations board</h2>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--color-ink-dim)]">Nashik-Trimbakeshwar common picture</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close operations panel" className="rounded-lg p-2 text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] md:hidden">
              <X size={18} />
            </button>
          )}
        </div>
        {stats && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            <RailStat label="reunited" value={stats.reunited} color={COLORS.green} />
            <RailStat label="duplicate" value={`${stats.duplicatePct}%`} color={COLORS.saffron} />
            <RailStat label="elderly" value={`${stats.elderlyPct}%`} color={COLORS.teal} />
          </div>
        )}
        <div className="flex rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-bg)] p-1">
          <button
            type="button"
            onClick={() => setMode('cases')}
            className="flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold transition"
            style={{ background: mode === 'cases' ? COLORS.surface2 : 'transparent', color: mode === 'cases' ? COLORS.ink : COLORS.inkDim }}
          >
            <ListFilter size={14} /> Case queue
          </button>
          <button
            type="button"
            onClick={() => setMode('layers')}
            className="flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold transition"
            style={{ background: mode === 'layers' ? COLORS.surface2 : 'transparent', color: mode === 'layers' ? COLORS.ink : COLORS.inkDim }}
          >
            <Layers3 size={14} /> Map layers
          </button>
        </div>
      </div>

      {mode === 'cases' ? (
        <>
          <div className="space-y-3 border-b border-[var(--color-line)] bg-[var(--color-bg)]/35 p-4">
            <label className="relative block">
              <span className="sr-only">Search cases</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Case, place, center, language"
                className="h-10 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-3 text-xs font-medium text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-teal)]"
              />
            </label>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              {(['Active', 'Matched', 'Pending', 'Unresolved'] as CaseFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition"
                  style={{
                    background: filter === value ? COLORS.saffron : COLORS.surface2,
                    color: filter === value ? '#17110d' : COLORS.inkDim,
                  }}
                >
                  {value} <span className="ml-1 opacity-70">{counts[value]}</span>
                </button>
              ))}
            </div>
            {selectedZone && (
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 text-xs">
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
                  className="group flex w-full items-start gap-3 border-b border-[var(--color-line-soft)] px-4 py-3.5 text-left transition hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-teal)]"
                  style={{ background: selectedCaseId === c.id ? COLORS.surface2 : undefined }}
                >
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border" style={{ background: `${STATUS_COLOR[c.status]}15`, borderColor: `${STATUS_COLOR[c.status]}38`, color: STATUS_COLOR[c.status] }}>
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="mono text-[10px] font-semibold text-[var(--color-ink)]">{c.id}</span>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}12` }}>{c.status}</span>
                    </span>
                    <span className="mt-1.5 block truncate text-[11px] font-medium text-[var(--color-ink-dim)]">
                      {c.ageBand} · {c.gender} · {c.language || 'language unknown'}
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium text-[var(--color-ink)]">{c.lastSeenLocation || c.geo.zone}</span>
                  </span>
                  <ChevronRight size={14} className="mt-2 shrink-0 text-[var(--color-ink-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-saffron)]" />
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
            <div className="flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-bg)]/45 px-4 py-3 text-[10px] font-medium text-[var(--color-ink-dim)]">
              <span><strong className="text-[var(--color-saffron)]">{stats.crossCenterDuplicates}</strong> cross-center duplicates</span>
              <span><strong className="text-[var(--color-red)]">{stats.unresolvedPct}%</strong> unresolved</span>
            </div>
          )}
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg)]/35 p-4 pb-6">
          <p className="mb-4 text-xs font-medium leading-relaxed text-[var(--color-ink-dim)]">
            Toggle the infrastructure context behind every report.
          </p>
          <div className="space-y-1.5">
            {LAYER_DEFS.map((layer) => {
              const enabled = layers[layer.key]
              const Icon = layer.icon
              return (
                <button
                  key={layer.key}
                  type="button"
                  aria-pressed={enabled}
                  onClick={() => onLayersChange({ ...layers, [layer.key]: !enabled })}
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface)] px-3 py-3 text-sm transition hover:border-[var(--color-line)] hover:bg-[var(--color-surface-2)]"
                  style={{ color: enabled ? COLORS.ink : COLORS.inkDim }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg)]">
                    <Icon size={15} style={{ color: enabled ? layer.color : COLORS.inkDim }} />
                  </span>
                  <span className="flex-1 text-left text-xs font-semibold">{layer.label}</span>
                  {geo && layer.count && <span className="mono text-[10px] text-[var(--color-ink-dim)]">{layer.count(geo, cases)}</span>}
                  <span className="relative h-5 w-9 rounded-full transition" style={{ background: enabled ? layer.color : COLORS.line }}>
                    <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-5 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] p-3.5">
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

function RailStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-bg)] px-2.5 py-2">
      <div className="text-sm font-extrabold leading-none tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-1 truncate text-[9px] font-semibold text-[var(--color-ink-dim)]">{label}</div>
    </div>
  )
}
