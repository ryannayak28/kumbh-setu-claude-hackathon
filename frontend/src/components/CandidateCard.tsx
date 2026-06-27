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
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: pct >= 85 ? `${COLORS.saffron}cc` : COLORS.line,
        background: COLORS.surface2,
      }}
    >
      <div className="h-1.5 bg-[var(--color-bg)]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="h-full" style={{ background: scoreColor(cand.score) }} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {f && <span className="mono text-[10px] font-semibold text-[var(--color-ink)]">{f.id}</span>}
              {crossCenter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg)] px-2 py-1 text-[9px] font-bold text-[var(--color-saffron)]">
                  <ArrowRightLeft size={10} /> Cross-center
                </span>
              )}
            </div>
          {f && (
              <div className="mt-2 text-xs font-semibold text-[var(--color-ink)]">{f.ageBand} · {f.gender} · {f.language ?? 'Language unknown'}</div>
          )}
          </div>
          <div className="text-right">
            <span className="block text-xl font-extrabold leading-none tabular-nums" style={{ color: scoreColor(cand.score) }}>{pct}%</span>
            <span className="mt-1 block text-[9px] font-bold text-[var(--color-ink-dim)]">{pct >= 85 ? 'Strong candidate' : 'Needs review'}</span>
          </div>
        </div>

        {f && (
          <div className="mt-3 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-bg)] p-3">
            <div className="text-[10px] font-medium text-[var(--color-ink-dim)]">Found at <span className="font-bold text-[var(--color-ink)]">{f.center}</span> · {f.observedLocation}</div>
            {f.note && <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-dim)]">{f.note}</p>}
          </div>
        )}

        <p className="mt-3 text-[11px] font-medium leading-relaxed text-[var(--color-ink)]">{cand.rationale}</p>

        {cand.fieldsMatched.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cand.fieldsMatched.map((fld) => (
              <span key={fld} className="rounded-full border border-[rgba(24,166,154,0.22)] bg-[rgba(24,166,154,0.1)] px-2 py-1 text-[9px] font-bold text-[var(--color-teal)]">{fld}</span>
            ))}
          </div>
        )}

        {onConfirm && !resolved && (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onConfirm} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-[#1a1206] transition hover:brightness-105 active:translate-y-px" style={{ background: COLORS.saffron }}>
              <Check size={14} /> Confirm reunion
            </button>
            <button type="button" onClick={onReject} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-xs font-bold text-[var(--color-ink-dim)] transition hover:text-[var(--color-ink)]">
              <X size={14} /> Reject
            </button>
          </div>
        )}
        {resolved === 'confirmed' && (
          <div className="mt-4 rounded-lg bg-[rgba(53,183,121,0.12)] py-2.5 text-center text-[10px] font-semibold" style={{ color: COLORS.green }}>
            Reunion confirmed · both records linked
          </div>
        )}
      </div>
    </motion.div>
  )
}
