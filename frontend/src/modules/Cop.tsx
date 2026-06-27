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
  MapPin,
  Clock3,
  ExternalLink,
} from 'lucide-react'
import SetuMap, { type Bridge, type LayerFlags } from '@/components/SetuMap'
import Beacon from '@/components/Beacon'
import CandidateCard from '@/components/CandidateCard'
import OperationsRail from '@/components/OperationsRail'
import Brand from '@/components/Brand'
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
    <div className="flex h-full flex-col fine-grid" style={{ background: COLORS.bg }}>
      <header className="surface-sheen z-20 flex min-h-[72px] items-center border-b border-[var(--color-line)]">
        <div className="flex h-[72px] min-w-0 items-center px-3 md:w-[340px] md:shrink-0 md:border-r md:border-[var(--color-line)] md:px-5">
          <Brand compact subtitle="Reunification operations · Kumbh 2027" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 px-3 md:px-4">
          <div className="mr-auto hidden items-center gap-2 2xl:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-teal)]">
              <MapPin size={15} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-[var(--color-ink)]">Nashik operations</span>
              <span className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-ink-dim)]"><Clock3 size={10} /> Live common picture</span>
            </span>
          </div>
          <Ticker stats={stats} live={liveCount} />
          <ServiceState health={health} />
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            aria-label="Open cases and map layers"
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] md:hidden"
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            onClick={() => setBeacon(true)}
            aria-label="New report"
            className="flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold text-[#1a1206] transition hover:brightness-105 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-saffron)]"
            style={{ background: COLORS.saffron }}
          >
            <Plus size={16} /> <span className="hidden sm:inline">New report</span>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="z-10 hidden w-[340px] shrink-0 border-r border-[var(--color-line)] md:block">
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
                className="absolute inset-y-0 left-0 z-40 w-[min(90vw,340px)] border-r border-[var(--color-line)] md:hidden"
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

          {geo && (
            <>
              <div className="pointer-events-none absolute left-4 top-4 z-[500] hidden rounded-xl border border-[var(--color-line)] bg-[rgba(20,19,15,0.94)] px-4 py-3 quiet-shadow sm:block">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-green)] opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-green)]" />
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-ink)]">Live operating picture</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-[var(--color-ink-dim)]">{liveCount} open cases across Nashik-Trimbakeshwar</p>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[rgba(20,19,15,0.94)] px-3 py-2 text-[10px] font-medium text-[var(--color-ink-dim)] quiet-shadow lg:flex">
                {[
                  ['Pending', COLORS.amber],
                  ['Matched', COLORS.saffron],
                  ['Unresolved', COLORS.red],
                  ['Reunited', COLORS.green],
                ].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>
                ))}
              </div>
            </>
          )}

          {bridge && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[900] -translate-x-1/2 rounded-lg border px-4 py-2 text-xs font-semibold glow-saffron" style={{ background: COLORS.surface, borderColor: COLORS.saffron, color: COLORS.saffron }}>
              Cross-center link confirmed
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
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="surface-sheen absolute inset-0 z-20 flex h-full flex-col border-l border-[var(--color-line)] sm:inset-y-0 sm:left-auto sm:w-[456px]"
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
    { l: 'Open', v: live, c: COLORS.saffron },
    { l: 'Reunited', v: stats.reunited, c: COLORS.green },
    { l: 'Unresolved', v: stats.unresolved, c: COLORS.red },
    { l: 'Median', v: `${stats.medianHours}h`, c: COLORS.teal },
  ]
  return (
    <div className="hidden items-center rounded-lg bg-[var(--color-bg)] px-1 lg:flex">
      {items.map((i) => (
        <div key={i.l} className="flex items-center gap-2 border-r border-[var(--color-line-soft)] px-3 py-2 last:border-0">
          <span className="h-2 w-2 rounded-full" style={{ background: i.c }} />
          <span>
            <span className="block text-xs font-bold leading-none tabular-nums text-[var(--color-ink)]">{i.v}</span>
            <span className="mt-1 block text-[9px] font-medium text-[var(--color-ink-dim)]">{i.l}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function ServiceState({ health }: { health: Health | null }) {
  if (!health) {
    return <span className="hidden h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-2)] 2xl:block" aria-label="Checking service status" />
  }
  const modelReady = health.model_ready
  return (
    <div
      className="hidden items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 2xl:flex"
      title={modelReady ? `${health.model} is available` : 'Deterministic extraction and matching remain available without a model key'}
    >
      {modelReady ? <Bot size={14} style={{ color: COLORS.teal }} /> : <WifiOff size={14} style={{ color: COLORS.amber }} />}
      <span className="text-[10px] font-semibold text-[var(--color-ink)]">{modelReady ? 'Claude live' : 'Resilient'}</span>
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
      <div className="flex items-start justify-between border-b border-[var(--color-line)] px-5 py-4">
        <div>
          <span className="text-[11px] font-bold text-[var(--color-ink-dim)]">Human review required</span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="mono text-sm font-semibold text-[var(--color-ink)]">{c.id}</span>
            <span className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: `${STATUS_COLOR[c.status]}16`, color: STATUS_COLOR[c.status] }}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> {c.status}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close case details" className="rounded-lg bg-[var(--color-surface-2)] p-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"><X size={18} /></button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <section>
          <h3 className="mb-3 text-xs font-semibold text-[var(--color-ink)]">Report summary</h3>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-sm">
            <Cell k="Age / gender" v={`${c.ageBand} · ${c.gender}`} />
            <Cell k="Language" v={c.language ?? '—'} />
            <Cell k="Last seen" v={c.lastSeenLocation || '—'} />
            <Cell k="Reporting center" v={c.reportingCenter} />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-bg)] text-[var(--color-teal)]"><Lock size={13} /></span> Protected information</span>
            {!purged && (
              <button type="button" onClick={onReveal} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-bg)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
                {reveal ? <EyeOff size={12} /> : <Eye size={12} />} {reveal ? 'mask' : 'reveal'}
              </button>
            )}
          </div>
          {purged ? (
            <p className="text-xs font-medium" style={{ color: COLORS.green }}>Purged at {new Date(c.pii.purgedAt!).toLocaleTimeString()} · minimised on reunion</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs text-[var(--color-ink-dim)]">
              <div><span className="block text-[9px] font-semibold">Name</span><span className="mono mt-1 block text-[var(--color-ink)]">{reveal ? c.pii.name ?? '—' : mask(c.pii.name)}</span></div>
              <div><span className="block text-[9px] font-semibold">Mobile</span><span className="mono mt-1 block text-[var(--color-ink)]">{reveal ? c.pii.mobile ?? '—' : mask(c.pii.mobile)}</span></div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-[var(--color-teal)]" />
            <h3 className="text-xs font-semibold text-[var(--color-ink)]">Location intelligence</h3>
          </div>
          <div className="space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] p-3.5 text-xs">
            <GeoRow label="Zone" value={c.geo.zone} />
            <GeoRow label="Nearest station" value={c.geo.nearestStation} />
            <GeoRow label="Cameras" value={c.geo.nearestCctv.slice(0, 4).join(', ') || '—'} color={COLORS.teal} />
            <GeoRow label="Chokepoints" value={c.geo.nearbyChokepoints.slice(0, 2).join(', ') || '—'} color={COLORS.amber} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]"><Search size={14} style={{ color: COLORS.saffron }} /> Reunify candidates</span>
            {candidates.length > 0 && <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-[9px] font-semibold text-[var(--color-ink-dim)]">{candidates.length} reviewed</span>}
          </div>
          {matching && <div className="space-y-2 rounded-xl bg-[var(--color-surface-2)] p-4" aria-label="Searching every center"><div className="h-2 animate-pulse rounded bg-[var(--color-line)]" /><div className="h-2 w-3/4 animate-pulse rounded bg-[var(--color-line)]" /></div>}
          {!matching && candidates.length === 0 && !reunited && (
            <div className="rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-4 py-5 text-center"><p className="text-sm font-semibold text-[var(--color-ink)]">No strong candidates yet</p><p className="mt-1 text-xs text-[var(--color-ink-dim)]">Setu will keep this case in the active queue.</p></div>
          )}
          <div className="space-y-3">
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
        </section>
      </div>

      <div className="border-t border-[var(--color-line)] bg-[var(--color-bg)] p-4">
        {reunited && !purged && (
          <button type="button" onClick={onCloseCase} className="w-full rounded-lg bg-[var(--color-green)] py-2.5 text-xs font-bold text-[#07140e] transition hover:brightness-105">
            Close case · auto-purge PII
          </button>
        )}
        <a href={`/track/${c.id}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-[10px] font-semibold text-[var(--color-ink-dim)] hover:text-[var(--color-teal)]">
          Open family status <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-h-[66px] border-b border-r border-[var(--color-line-soft)] px-3.5 py-3">
      <div className="text-[9px] font-semibold text-[var(--color-ink-dim)]">{k}</div>
      <div className="mt-1 text-xs font-medium leading-snug text-[var(--color-ink)]">{v}</div>
    </div>
  )
}

function GeoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 shrink-0 text-[10px] font-medium text-[var(--color-ink-dim)]">{label}</span>
      <span className="min-w-0 flex-1 text-right text-[10px] font-semibold leading-relaxed text-[var(--color-ink)]" style={{ color }}>{value}</span>
    </div>
  )
}

function mask(v?: string | null) {
  if (!v) return '—'
  return v[0] + '•••••'
}
