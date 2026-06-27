import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Eye,
  EyeOff,
  X,
  Search,
  Lock,
  Menu,
  WifiOff,
  Bot,
  AlertCircle,
} from 'lucide-react'
import SetuMap, { type Bridge, type LayerFlags } from '@/components/SetuMap'
import Beacon from '@/components/Beacon'
import CandidateCard from '@/components/CandidateCard'
import OperationsRail from '@/components/OperationsRail'
import {
  getGeo,
  getStats,
  getCases,
  getCase,
  getHealth,
  postMatch,
  confirmReunify,
  closeCase,
} from '@/lib/api'
import type { Health } from '@/lib/api'
import type { Case, Geo, MatchCandidate, Stats, IntakeResponse } from '@/shared/types'
import { COLORS, STATUS_COLOR, centerCoord } from '@/lib/theme'

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
  const [health, setHealth] = useState<Health | null>(null)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; message: string } | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    Promise.all([getGeo(), getStats(), getCases(), getHealth()])
      .then(([geoData, statsData, caseData, healthData]) => {
        setGeo(geoData)
        setStats(statsData)
        setCases(caseData)
        setHealth(healthData)
      })
      .catch((error) => setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not load the operating picture.' }))
      .finally(() => setBooting(false))
  }, [])

  async function selectCase(c: Case) {
    setSelected(c)
    setBridge(null)
    setLivePin(null)
    setCandidates([])
    setResolution({})
    setReveal(false)
    setRailOpen(false)
    if (c.geo.lastSeenLatLng) setFlyTo([...c.geo.lastSeenLatLng])
    setMatching(true)
    try {
      const r = await postMatch(c.id)
      setCandidates(r.candidates)
      if (r.candidates.length && !['Reunited', 'Transferred'].includes(c.status)) {
        const matched = { ...c, status: 'Matched' as const }
        setSelected(matched)
        setCases((items) => items.map((item) => item.id === c.id ? matched : item))
      }
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not search for matches.' })
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
    setReveal(false)
    if (r.case.geo.lastSeenLatLng) {
      setLivePin([...r.case.geo.lastSeenLatLng])
      setFlyTo([...r.case.geo.lastSeenLatLng])
    }
  }

  async function confirm(cand: MatchCandidate) {
    if (!selected) return
    try {
      const res = await confirmReunify(selected.id, cand.foundId)
      setResolution((m) => ({ ...m, [cand.foundId]: 'confirmed' }))
      setSelected(res.case)
      setCases((cs) => cs.map((c) => (c.id === res.case.id ? res.case : c)))
      setNotice({ tone: 'info', message: 'Reunion confirmed. Both centers can now act on the same record.' })
      const a = cand.found ? centerCoord(cand.found.center) : null
      const b = centerCoord(res.case.reportingCenter)
      if (a && b) {
        setBridge({ from: a, to: b })
        setFlyTo([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
      }
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not confirm this reunion.' })
    }
  }

  async function close() {
    if (!selected) return
    try {
      const res = await closeCase(selected.id)
      setSelected(res.case)
      setCases((cs) => cs.map((c) => (c.id === res.case.id ? res.case : c)))
      setReveal(false)
      setNotice({ tone: 'info', message: 'Case closed. Personal data was purged.' })
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not close this case.' })
    }
  }

  async function toggleReveal() {
    if (!selected) return
    try {
      const next = !reveal
      const fresh = await getCase(selected.id, next)
      setSelected(fresh)
      setReveal(next)
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not update protected-data visibility.' })
    }
  }

  const liveCount = cases.filter((c) => ['Reported', 'Pending', 'Matched', 'Unresolved'].includes(c.status)).length

  return (
    <div className="flex h-full flex-col" style={{ background: COLORS.bg }}>
      {/* Masthead */}
      <header className="z-20 flex min-h-14 items-center justify-between border-b border-[var(--color-line)] px-3 py-2 sm:px-5" style={{ background: COLORS.bg }}>
        <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
          <span style={{ fontFamily: 'var(--font-deva)', color: COLORS.saffron }} className="text-2xl font-bold leading-none">
            सेतु
          </span>
          <span className="hidden text-xl font-bold tracking-tight sm:inline">Setu</span>
          <span className="eyebrow hidden sm:inline">Common Operating Picture · Simhastha Kumbh 2027</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ServiceState health={health} />
          <Ticker stats={stats} live={liveCount} />
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            aria-label="Open cases and map layers"
            className="rounded-md border border-[var(--color-line)] p-2 text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] md:hidden"
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            onClick={() => setBeacon(true)}
            aria-label="New report"
            className="flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-[#1a1206] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-saffron)]"
            style={{ background: COLORS.saffron }}
          >
            <Plus size={16} /> <span className="hidden sm:inline">New report</span>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="z-10 hidden w-72 shrink-0 border-r border-[var(--color-line)] md:block">
          <OperationsRail
            geo={geo}
            stats={stats}
            cases={cases}
            layers={layers}
            selectedCaseId={selected?.id}
            selectedZone={selectedZone}
            onLayersChange={setLayers}
            onSelectCase={selectCase}
            onClearZone={() => setSelectedZone(null)}
          />
        </aside>

        <AnimatePresence>
          {railOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Dismiss operations panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRailOpen(false)}
                className="absolute inset-0 z-30 bg-black/60 md:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 z-40 w-[min(88vw,320px)] border-r border-[var(--color-line)] md:hidden"
              >
                <OperationsRail
                  geo={geo}
                  stats={stats}
                  cases={cases}
                  layers={layers}
                  selectedCaseId={selected?.id}
                  selectedZone={selectedZone}
                  onLayersChange={setLayers}
                  onSelectCase={selectCase}
                  onClearZone={() => setSelectedZone(null)}
                  onClose={() => setRailOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

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
              selectedZone={selectedZone}
              onSelectZone={(zone) => {
                setSelectedZone(zone)
                setRailOpen(true)
              }}
              onSelectCase={selectCase}
            />
          ) : (
            <LoadingMap failed={!booting} />
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
              className="absolute inset-0 z-20 flex h-full flex-col border-l border-[var(--color-line)] panel sm:inset-y-0 sm:left-auto sm:w-[390px]"
            >
              <Drawer
                c={selected}
                candidates={candidates}
                matching={matching}
                resolution={resolution}
                reveal={reveal}
                onReveal={toggleReveal}
                onConfirm={confirm}
                onReject={(cand) => setResolution((m) => ({ ...m, [cand.foundId]: 'rejected' }))}
                onClose={() => { setSelected(null); setBridge(null); setLivePin(null) }}
                onCloseCase={close}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,560px)] -translate-x-1/2 items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
            style={{
              background: COLORS.surface,
              borderColor: notice.tone === 'error' ? COLORS.red : COLORS.teal,
              color: COLORS.ink,
            }}
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: notice.tone === 'error' ? COLORS.red : COLORS.teal }} />
            <span className="flex-1">{notice.message}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

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

function ServiceState({ health }: { health: Health | null }) {
  if (!health) {
    return <span className="hidden h-8 w-24 animate-pulse rounded-md bg-[var(--color-surface)] sm:block" aria-label="Checking service status" />
  }
  const modelReady = health.model_ready
  return (
    <div
      className="hidden items-center gap-2 rounded-md bg-[var(--color-surface)] px-2.5 py-1.5 sm:flex"
      title={modelReady ? `${health.model} is available` : 'Deterministic extraction and matching remain available without a model key'}
    >
      {modelReady ? <Bot size={14} style={{ color: COLORS.teal }} /> : <WifiOff size={14} style={{ color: COLORS.amber }} />}
      <span className="text-[11px] font-medium text-[var(--color-ink)]">{modelReady ? 'Claude live' : 'Resilient mode'}</span>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: modelReady ? COLORS.green : COLORS.amber }} />
    </div>
  )
}

function LoadingMap({ failed }: { failed: boolean }) {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      {failed ? (
        <div>
          <WifiOff size={24} className="mx-auto mb-3 text-[var(--color-red)]" />
          <p className="text-sm font-medium text-[var(--color-ink)]">Operating picture unavailable</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-ink-dim)]">The FastAPI service could not be reached. Check that the backend is running on port 8000, then refresh.</p>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-3" aria-label="Loading operating picture">
          <div className="h-2 animate-pulse rounded bg-[var(--color-surface-2)]" />
          <div className="h-2 w-4/5 animate-pulse rounded bg-[var(--color-surface-2)]" />
          <div className="h-2 w-3/5 animate-pulse rounded bg-[var(--color-surface-2)]" />
        </div>
      )}
    </div>
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
        <button type="button" onClick={onClose} aria-label="Close case details" className="rounded-md p-1 text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"><X size={18} /></button>
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
              <button type="button" onClick={onReveal} className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]">
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
                onConfirm={reunited ? undefined : () => onConfirm(cand)}
                onReject={reunited ? undefined : () => onReject(cand)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-[var(--color-line)] p-3">
        {reunited && !purged && (
          <button type="button" onClick={onCloseCase} className="w-full rounded-lg border border-[var(--color-line)] py-2 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-green)]">
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
