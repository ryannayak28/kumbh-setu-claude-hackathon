import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, MapPin, ShieldCheck } from 'lucide-react'
import { getTrack } from '@/lib/api'
import type { TrackInfo } from '@/shared/types'
import { COLORS } from '@/lib/theme'

const STAGE_LABEL: Record<string, string> = {
  Reported: 'Report received',
  Pending: 'Searching every center',
  Matched: 'Possible match found',
  Reunited: 'Reunited',
}

export default function Track() {
  const { caseId = '' } = useParams()
  const [info, setInfo] = useState<TrackInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTrack(caseId).then(setInfo).catch(() => setError('We could not find that case.'))
  }, [caseId])

  return (
    <div className="flex min-h-full items-center justify-center p-6" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-baseline justify-center gap-2">
          <span style={{ fontFamily: 'var(--font-deva)', color: COLORS.saffron }} className="text-2xl font-bold">सेतु</span>
          <span className="text-xl font-bold">Setu</span>
        </div>

        {error && <p className="text-center text-sm" style={{ color: COLORS.red }}>{error}</p>}

        {info && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel rounded-2xl p-6">
            <div className="mb-1 flex items-center justify-between">
              <span className="eyebrow">case status</span>
              <span className="mono text-xs text-[var(--color-ink-dim)]">{info.caseId}</span>
            </div>
            <h1 className="mb-6 text-2xl font-bold" style={{ color: info.stage === 'Reunited' ? COLORS.green : COLORS.ink }}>
              {STAGE_LABEL[info.stage] ?? info.stage}
            </h1>

            <ol className="relative ml-3 space-y-5 border-l border-[var(--color-line)] pl-6">
              {info.stages.map((s) => {
                const idx = info.stages.indexOf(s)
                const cur = info.stages.indexOf(info.stage)
                const done = idx <= cur
                const isNow = idx === cur
                return (
                  <li key={s} className="relative">
                    <span
                      className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full"
                      style={{
                        background: done ? COLORS.green : COLORS.surface,
                        border: `1.5px solid ${done ? COLORS.green : COLORS.line}`,
                        boxShadow: isNow ? `0 0 0 4px rgba(63,185,132,0.15)` : 'none',
                      }}
                    >
                      {done && <Check size={12} color="#0a0e1c" />}
                    </span>
                    <div className="text-sm font-medium" style={{ color: done ? COLORS.ink : COLORS.inkDim }}>
                      {STAGE_LABEL[s] ?? s}
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-ink-dim)]">
              <MapPin size={13} style={{ color: COLORS.teal }} />
              Area: <span className="text-[var(--color-ink)]">{info.genericLocation}</span>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--color-ink-dim)]">
              <ShieldCheck size={12} style={{ color: COLORS.green }} />
              No personal details are shown on this page.
            </p>
          </motion.div>
        )}

        {!info && !error && <p className="text-center text-sm text-[var(--color-ink-dim)]">Loading…</p>}
      </div>
    </div>
  )
}
