import { motion } from 'framer-motion'
import { Check, X, ArrowRightLeft } from 'lucide-react'
import type { MatchCandidate } from '@/shared/types'
import { COLORS } from '@/lib/theme'

function scoreColor(s: number) {
  if (s >= 0.85) return COLORS.green
  if (s >= 0.6) return COLORS.saffron
  if (s >= 0.4) return COLORS.amber
  return COLORS.inkDim
}

export default function CandidateCard({
  cand,
  reportingCenter,
  onConfirm,
  onReject,
  resolved,
}: {
  cand: MatchCandidate
  reportingCenter: string
  onConfirm?: () => void
  onReject?: () => void
  resolved?: 'confirmed' | 'rejected' | null
}) {
  const f = cand.found
  const pct = Math.round(cand.score * 100)
  const crossCenter = f && f.center !== reportingCenter
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: resolved === 'rejected' ? 0.4 : 1, y: 0 }}
      className="rounded-lg border p-3"
      style={{
        borderColor: pct >= 85 ? COLORS.saffron : COLORS.line,
        background: COLORS.surface,
        boxShadow: pct >= 85 ? '0 0 22px -8px rgba(255,138,61,0.7)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="mono text-2xl font-semibold tabular-nums"
              style={{ color: scoreColor(cand.score) }}
            >
              {pct}%
            </span>
            <span className="eyebrow">confidence</span>
          </div>
          {f && (
            <div className="mt-1 text-sm text-[var(--color-ink)]">
              <span className="mono text-[var(--color-ink-dim)]">{f.id}</span> · {f.ageBand}{' '}
              {f.gender} · {f.language ?? '—'}
            </div>
          )}
        </div>
        {crossCenter && (
          <span
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium"
            style={{ background: 'rgba(255,138,61,0.12)', color: COLORS.saffron }}
          >
            <ArrowRightLeft size={11} /> cross-center
          </span>
        )}
      </div>

      {f && (
        <div className="mono mt-2 text-xs text-[var(--color-ink-dim)]">
          found at <span className="text-[var(--color-ink)]">{f.center}</span> · {f.observedLocation}
        </div>
      )}

      <p className="mt-2 text-[13px] leading-snug text-[var(--color-ink)]">{cand.rationale}</p>

      {cand.fieldsMatched.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cand.fieldsMatched.map((fld) => (
            <span
              key={fld}
              className="mono rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-teal)]"
            >
              {fld}
            </span>
          ))}
        </div>
      )}

      {onConfirm && !resolved && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold text-[#1a1206] transition hover:brightness-110"
            style={{ background: COLORS.saffron }}
          >
            <Check size={15} /> Confirm reunion
          </button>
          <button
            onClick={onReject}
            className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink-dim)] transition hover:text-[var(--color-ink)]"
          >
            <X size={15} /> Not a match
          </button>
        </div>
      )}
      {resolved === 'confirmed' && (
        <div className="mono mt-3 rounded-md py-2 text-center text-xs" style={{ background: 'rgba(63,185,132,0.14)', color: COLORS.green }}>
          ✓ Reunion confirmed — both centers notified
        </div>
      )}
    </motion.div>
  )
}
