import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Cctv,
  Shield,
  TriangleAlert,
  Hexagon,
  Plus,
  Eye,
  EyeOff,
  X,
  Search,
  Lock,
} from 'lucide-react'
import SetuMap, { type Bridge, type LayerFlags } from '@/components/SetuMap'
import Beacon from '@/components/Beacon'
import CandidateCard from '@/components/CandidateCard'
import {
  getGeo,
  getStats,
  getCases,
  postMatch,
  confirmReunify,
  closeCase,
} from '@/lib/api'
import type { Case, Geo, MatchCandidate, Stats, IntakeResponse } from '@/shared/types'
import { COLORS, STATUS_COLOR, centerCoord } from '@/lib/theme'

const LAYER_DEFS: { key: keyof LayerFlags; label: string; icon: typeof Cctv; color: string; count?: (g: Geo) => number }[] = [
  { key: 'cases', label: 'Active cases', icon: Radio, color: COLORS.saffron },
  { key: 'cctv', label: 'CCTV cameras', icon: Cctv, color: COLORS.teal, count: (g) => g.cctv.length },
  { key: 'police', label: 'Police stations', icon: Shield, color: '#7aa2ff', count: (g) => g.stations.length },
  { key: 'chokepoints', label: 'Chokepoints', icon: TriangleAlert, color: COLORS.amber, count: (g) => g.chokepoints.length },
  { key: 'zones', label: 'Zone boundaries', icon: Hexagon, color: COLORS.line, count: (g) => g.zones.length },
]

export default function Cop() {
  const [geo, setGeo] = useState<Geo | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [layers, setLayers] = useState<LayerFlags>({ cases: true, cctv: false, police: true, chokepoints: true, zones: true })
  const [selected, setSelected] = useState<Case | null>(null)
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [matching, setMatching] = useState(false)
  const [resolution, setResolution] = useState<Record<string, 'confirmed' | 'rejected'>>({})
  const [beacon, setBeacon] = useState(false)
  const [bridge, setBridge] = useState<Bridge | null>(null)
  const [livePin, setLivePin] = useState<[number, number] | null>(null)
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    getGeo().then(setGeo).catch(console.error)
    getStats().then(setStats).catch(console.error)
    getCases().then(setCases).catch(console.error)
  }, [])

  async function selectCase(c: Case) {
    setSelected(c)
    setBridge(null)
    setLivePin(null)
    setCandidates([])
    setResolution({})
    if (c.geo.lastSeenLatLng) setFlyTo([...c.geo.lastSeenLatLng])
    setMatching(true)
    try {
      const r = await postMatch(c.id)
      setCandidates(r.candidates)
    } finally {
      setMatching(false)
    }
  }

  function onBeaconResult(r: IntakeResponse) {
    setBeacon(false)
    setCases((cs) => [r.case, ...cs.filter((x) => x.id !== r.case.id)])
    setSelected(r.case)
    setCandidates(r.candidates)
    setResolution({})
    setBridge(null)
    if (r.case.geo.lastSeenLatLng) {
      setLivePin([...r.case.geo.lastSeenLatLng])
      setFlyTo([...r.case.geo.lastSeenLatLng])
    }
  }

  async function confirm(cand: MatchCandidate) {
    if (!selected) return
    const res = await confirmReunify(selected.id, cand.foundId)
    setResolution((m) => ({ ...m, [cand.foundId]: 'confirmed' }))
    setSelected(res.case)
    setCases((cs) => cs.map((c) => (c.id === res.case.id ? res.case : c)))
    // Draw the bridge: found center  ⇄  family's reporting center.
    const a = cand.found ? centerCoord(cand.found.center) : null
    const b = centerCoord(res.case.reportingCenter)
    if (a && b) {
      setBridge({ from: a, to: b })
      setFlyTo([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
    }
  }

  async function close() {
    if (!selected) return
    const res = await closeCase(selected.id)
    setSelected(res.case)
    setCases((cs) => cs.map((c) => (c.id === res.case.id ? res.case : c)))
  }

  const liveCount = cases.filter((c) => ['Reported', 'Pending', 'Matched', 'Unresolved'].includes(c.status)).length

  return (
    <div className="flex h-full flex-col" style={{ background: COLORS.bg }}>
      {/* Masthead */}
      <header className="z-20 flex items-center justify-between border-b border-[var(--color-line)] px-5 py-2.5" style={{ background: COLORS.bg }}>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: 'var(--font-deva)', color: COLORS.saffron }} className="text-2xl font-bold leading-none">
            सेतु
          </span>
          <span className="text-xl font-bold tracking-tight">Setu</span>
          <span className="eyebrow hidden sm:inline">Common Operating Picture · Simhastha Kumbh 2027</span>
        </div>
        <div className="flex items-center gap-4">
          <Ticker stats={stats} live={liveCount} />
          <button
            onClick={() => setBeacon(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1a1206]"
            style={{ background: COLORS.saffron }}
          >
            <Plus size={16} /> New report
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Layer rail */}
        <aside className="z-10 hidden w-60 shrink-0 flex-col gap-4 border-r border-[var(--color-line)] p-4 md:flex" style={{ background: COLORS.bg }}>
          <div>
            <p className="eyebrow mb-2">Map layers</p>
            <div className="space-y-1">
              {LAYER_DEFS.map((l) => {
                const on = layers[l.key]
                const Icon = l.icon
                return (
                  <button
                    key={l.key}
                    onClick={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--color-surface)]"
                    style={{ color: on ? COLORS.ink : COLORS.inkDim }}
                  >
                    <span className="flex h-3 w-3 items-center justify-center rounded-full" style={{ background: on ? l.color : 'transparent', border: `1px solid ${on ? l.color : COLORS.line}` }} />
                    <Icon size={15} style={{ color: on ? l.color : COLORS.inkDim }} />
                    <span className="flex-1 text-left">{l.label}</span>
                    {geo && l.count && <span className="mono text-[10px] text-[var(--color-ink-dim)]">{l.count(geo)}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto rounded-lg border border-[var(--color-line)] p-3">
            <p className="eyebrow mb-2">Why it matters</p>
            {stats ? (
              <ul className="space-y-2 text-xs text-[var(--color-ink-dim)]">
                <Pitch v={`${stats.crossCenterDuplicates}`} l="cross-center duplicates today — invisible across centers" color={COLORS.saffron} />
                <Pitch v={`${stats.unresolvedPct}%`} l={`still unresolved · tail to ${stats.maxHours}h`} color={COLORS.red} />
                <Pitch v={`${stats.elderlyPct}%`} l="of the missing are 61+ — the at-risk group" color={COLORS.amber} />
                <Pitch v={`${stats.languages}`} l="languages, no clean join key" color={COLORS.teal} />
              </ul>
            ) : (
              <p className="text-xs text-[var(--color-ink-dim)]">loading…</p>
            )}
          </div>
        </aside>

        {/* Map (isolate so Leaflet's internal panes don't paint over the drawer) */}
        <main className="relative isolate flex-1">
          {geo ? (
            <SetuMap
              geo={geo}
              cases={cases}
              layers={layers}
              selectedCaseId={selected?.id}
              flyTo={flyTo}
              bridge={bridge}
              livePin={livePin}
              onSelectCase={selectCase}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--color-ink-dim)]">Loading operating picture…</div>
          )}

          {bridge && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[900] -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs glow-saffron" style={{ background: COLORS.bg, borderColor: COLORS.saffron, color: COLORS.saffron }}>
              setu · the cross-center gap, closed
            </div>
          )}
        </main>

        {/* Drilldown drawer */}
        <AnimatePresence>
          {selected && (
            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 z-10 flex h-full w-[var(--w)] flex-col border-l border-[var(--color-line)] panel"
              style={{ ['--w' as string]: '370px' }}
            >
              <Drawer
                c={selected}
                candidates={candidates}
                matching={matching}
                resolution={resolution}
                reveal={reveal}
                onReveal={() => setReveal((r) => !r)}
                onConfirm={confirm}
                onReject={(cand) => setResolution((m) => ({ ...m, [cand.foundId]: 'rejected' }))}
                onClose={() => { setSelected(null); setBridge(null); setLivePin(null) }}
                onCloseCase={close}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {beacon && <Beacon onClose={() => setBeacon(false)} onResult={onBeaconResult} />}
    </div>
  )
}

function Ticker({ stats, live }: { stats: Stats | null; live: number }) {
  if (!stats) return null
  const items = [
    { l: 'live cases', v: live, c: COLORS.saffron },
    { l: 'reunited', v: stats.reunited, c: COLORS.green },
    { l: 'unresolved', v: stats.unresolved, c: COLORS.red },
    { l: 'median', v: `${stats.medianHours}h`, c: COLORS.teal },
  ]
  return (
    <div className="hidden items-center gap-4 lg:flex">
      {items.map((i) => (
        <div key={i.l} className="text-right">
          <div className="mono text-base font-semibold leading-none tabular-nums" style={{ color: i.c }}>{i.v}</div>
          <div className="eyebrow">{i.l}</div>
        </div>
      ))}
    </div>
  )
}

function Pitch({ v, l, color }: { v: string; l: string; color: string }) {
  return (
    <li className="flex gap-2">
      <span className="mono shrink-0 font-semibold tabular-nums" style={{ color }}>{v}</span>
      <span className="leading-tight">{l}</span>
    </li>
  )
}

function Drawer({
  c,
  candidates,
  matching,
  resolution,
  reveal,
  onReveal,
  onConfirm,
  onReject,
  onClose,
  onCloseCase,
}: {
  c: Case
  candidates: MatchCandidate[]
  matching: boolean
  resolution: Record<string, 'confirmed' | 'rejected'>
  reveal: boolean
  onReveal: () => void
  onConfirm: (cand: MatchCandidate) => void
  onReject: (cand: MatchCandidate) => void
  onClose: () => void
  onCloseCase: () => void
}) {
  const reunited = c.status === 'Reunited'
  const purged = !!c.pii.purgedAt
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[c.status] }} />
          <span className="mono text-sm font-semibold">{c.id}</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--color-surface-2)', color: STATUS_COLOR[c.status] }}>{c.status}</span>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"><X size={18} /></button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Operational fields (matchable) */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Cell k="Age / gender" v={`${c.ageBand} · ${c.gender}`} />
          <Cell k="Language" v={c.language ?? '—'} />
          <Cell k="Last seen" v={c.lastSeenLocation || '—'} />
          <Cell k="Reporting center" v={c.reportingCenter} />
        </div>

        {/* PII block — separated + masked (DPDP) */}
        <div className="rounded-lg border border-[var(--color-line)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1"><Lock size={11} /> PII · DPDP-protected</span>
            {!purged && (
              <button onClick={onReveal} className="flex items-center gap-1 text-[11px] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
                {reveal ? <EyeOff size={12} /> : <Eye size={12} />} {reveal ? 'mask' : 'reveal'}
              </button>
            )}
          </div>
          {purged ? (
            <p className="mono text-xs" style={{ color: COLORS.green }}>● purged at {new Date(c.pii.purgedAt!).toLocaleTimeString()} — minimised on reunion</p>
          ) : (
            <div className="mono space-y-1 text-xs text-[var(--color-ink-dim)]">
              <div>name: <span className="text-[var(--color-ink)]">{reveal ? c.pii.name ?? '—' : mask(c.pii.name)}</span></div>
              <div>mobile: <span className="text-[var(--color-ink)]">{reveal ? c.pii.mobile ?? '—' : mask(c.pii.mobile)}</span></div>
            </div>
          )}
        </div>

        {/* Geo resolution */}
        <div className="rounded-lg border border-[var(--color-line)] p-3">
          <span className="eyebrow">geo-resolved</span>
          <div className="mono mt-1 space-y-0.5 text-xs text-[var(--color-ink-dim)]">
            <div>zone <span className="text-[var(--color-ink)]">{c.geo.zone}</span></div>
            <div>station <span className="text-[var(--color-ink)]">{c.geo.nearestStation}</span></div>
            <div>cameras <span className="text-[var(--color-teal)]">{c.geo.nearestCctv.slice(0, 4).join(', ') || '—'}</span></div>
            <div>chokepoints <span className="text-[var(--color-amber)]">{c.geo.nearbyChokepoints.slice(0, 2).join(', ') || '—'}</span></div>
          </div>
        </div>

        {/* Reunify */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Search size={14} style={{ color: COLORS.saffron }} />
            <span className="eyebrow">Reunify · cross-center candidates</span>
          </div>
          {matching && <p className="text-sm text-[var(--color-ink-dim)]">Claude is searching every center…</p>}
          {!matching && candidates.length === 0 && !reunited && (
            <p className="text-sm text-[var(--color-ink-dim)]">No candidates above threshold.</p>
          )}
          <div className="space-y-2">
            {candidates.map((cand) => (
              <CandidateCard
                key={cand.foundId}
                cand={cand}
                reportingCenter={c.reportingCenter}
                resolved={resolution[cand.foundId] ?? null}
                onConfirm={() => onConfirm(cand)}
                onReject={() => onReject(cand)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-[var(--color-line)] p-3">
        {reunited && !purged && (
          <button onClick={onCloseCase} className="w-full rounded-lg border border-[var(--color-line)] py-2 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-green)]">
            Close case · auto-purge PII
          </button>
        )}
        <a href={`/track/${c.id}`} target="_blank" rel="noreferrer" className="mono mt-2 block text-center text-[11px] text-[var(--color-ink-dim)] hover:text-[var(--color-teal)]">
          family track link → /track/{c.id}
        </a>
      </div>
    </div>
  )
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2">
      <div className="eyebrow">{k}</div>
      <div className="text-[var(--color-ink)]">{v}</div>
    </div>
  )
}

function mask(v?: string | null) {
  if (!v) return '—'
  return v[0] + '•••••'
}
