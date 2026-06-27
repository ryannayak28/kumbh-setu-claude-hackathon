import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, X, MapPin, MessageSquare, ArrowRight, ShieldCheck, WifiOff } from 'lucide-react'
import { postIntake } from '@/lib/api'
import type { IntakeResponse } from '@/shared/types'
import { COLORS } from '@/lib/theme'

// Prefilled, deliberately messy multilingual reports — the channel the
// ~99.998% who never installed the 2025 app actually use (CONTEXT §2).
const SAMPLES = [
  {
    label: 'Maithili · Ramkund',
    center: 'Nashik Road Center',
    text: 'beta papa kho gaye Ramkund ke paas, umar karib 75 saal, sirf Maithili bolte hain, kesari shawl aur rudraksha mala pehni thi',
  },
  {
    label: 'Bengali · Sadhugram',
    center: 'Central Control Room',
    text: 'amar ma harie gechhe Sadhugram Gate 2 er kachhe, boyos 70 er moto, Bengali bole, sada saree pora',
  },
  {
    label: 'English · Nashik Road',
    center: 'Panchavati Center',
    text: 'my father, around 80, went missing near Nashik Road Station an hour ago, he is hard of hearing and speaks Telugu',
  },
]

export default function Beacon({
  onClose,
  onResult,
}: {
  onClose: () => void
  onResult: (r: IntakeResponse) => void
}) {
  const [text, setText] = useState(() => localStorage.getItem('setu:intake-draft') ?? '')
  const [center, setCenter] = useState('Nashik Road Center')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IntakeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('setu:intake-draft', text)
  }, [text])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  async function submit() {
    if (!text.trim() || !consent) return
    setLoading(true)
    setError(null)
    try {
      const r = await postIntake({ rawText: text, channel: 'whatsapp', reportingCenter: center, consent })
      setResult(r)
      localStorage.removeItem('setu:intake-draft')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Intake failed')
    } finally {
      setLoading(false)
    }
  }

  const c = result?.case
  const top = result?.candidates?.[0]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(3,5,9,0.82)' }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="beacon-title"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] md:grid-cols-2 md:overflow-hidden"
      >
        <button type="button" onClick={onClose} aria-label="Close intake" className="absolute right-4 top-4 z-10 rounded-lg bg-[var(--color-surface-2)] p-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
          <X size={18} />
        </button>
        {/* Left — the pilgrim's channel (no app, just a message) */}
        <div className="flex min-h-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-bg)]">
          <div className="flex items-center border-b border-[var(--color-line)] px-5 py-4 pr-16 md:pr-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(44,185,174,0.12)] text-[var(--color-teal)]"><MessageSquare size={17} /></span>
              <span>
                <span id="beacon-title" className="block text-sm font-semibold">New missing-person report</span>
                <span className="mt-0.5 block text-[10px] text-[var(--color-ink-dim)]">Message-first intake · no app required</span>
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div>
              <p className="text-xs font-semibold text-[var(--color-ink)]">Start with a realistic report</p>
              <p className="mt-1 text-[10px] text-[var(--color-ink-dim)]">Choose a multilingual sample or type your own message.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setText(s.text)
                    setCenter(s.center)
                    setResult(null)
                  }}
                  className="rounded-full bg-[var(--color-surface-2)] px-3 py-2 text-[10px] font-semibold text-[var(--color-ink-dim)] transition hover:bg-[rgba(244,122,42,0.12)] hover:text-[var(--color-saffron)]"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {text && (
              <div className="ml-auto max-w-[88%] rounded-xl rounded-br-sm border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-xs leading-relaxed text-[var(--color-ink)]">
                {text}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[var(--color-ink-dim)]">Reporting at</span>
              <select
                value={center}
                aria-label="Reporting center"
                onChange={(e) => setCenter(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 text-[10px] font-medium text-[var(--color-ink)]"
              >
                {['Nashik Road Center', 'Central Control Room', 'Panchavati Center', 'Adgaon Kho-Ya-Paya', 'Sadhugram Lost Found'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a report in any language…"
                rows={2}
                maxLength={2000}
                aria-label="Missing-person report"
                className="min-w-0 flex-1 resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-3 text-xs leading-relaxed outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-teal)]"
              />
              <button
                type="button"
                onClick={submit}
                disabled={loading || !text.trim() || !consent}
                aria-label="Send report"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: COLORS.saffron, color: '#1a1206' }}
              >
                <Send size={17} />
              </button>
            </div>
            <label className="mt-3 flex min-w-0 cursor-pointer items-start gap-2 overflow-hidden rounded-lg bg-[var(--color-bg)] p-3 text-[10px] leading-relaxed text-[var(--color-ink-dim)]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-saffron)]"
              />
              <span className="min-w-0">I consent to using this report only to locate and reunite this person. Personal details will be purged when the case closes.</span>
            </label>
          </div>
        </div>

        {/* Right — what Claude makes of it */}
        <div className="flex min-h-0 flex-col bg-[var(--color-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-5 py-4 pr-16">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(244,122,42,0.12)] text-[var(--color-saffron)]"><Sparkles size={17} /></span>
            <span>
              <span className="block text-sm font-semibold">Setu processing</span>
              <span className="mt-0.5 block text-[10px] text-[var(--color-ink-dim)]">Extract · locate · search every center</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!result && !loading && (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-saffron)]"><Sparkles size={20} /></span>
                <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">Ready to structure the report</p>
                <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-[var(--color-ink-dim)]">Setu will normalize the message, resolve the location, and search records across every connected center.</p>
              </div>
            )}
            {loading && (
              <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center text-xs text-[var(--color-ink-dim)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(244,122,42,0.12)]"><Sparkles className="animate-pulse" style={{ color: COLORS.saffron }} /></span>
                <span>Reading the report, resolving location,<br />and searching every center…</span>
              </div>
            )}
            {error && <p className="mt-6 text-sm" style={{ color: COLORS.red }}>{error}</p>}

            <AnimatePresence>
              {c && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="mono text-xs font-semibold text-[var(--color-ink)]">{c.id}</span>
                    <span className="flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-[9px] font-semibold text-[var(--color-ink-dim)]">
                      {result?.extractedBy === 'claude' ? <Sparkles size={11} /> : <WifiOff size={11} />}
                      {result?.extractedBy === 'claude' ? 'Claude-assisted' : 'Resilient local fallback'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-sm">
                    <Field k="Gender" v={c.gender} />
                    <Field k="Age band" v={c.ageBand} />
                    <Field k="Language" v={c.language ?? '—'} />
                    <Field k="Last seen" v={c.lastSeenLocation || '—'} />
                  </div>
                  <div className="rounded-xl bg-[var(--color-bg)] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin size={13} style={{ color: COLORS.teal }} />
                      <span className="text-[10px] font-semibold text-[var(--color-ink)]">Location resolved</span>
                    </div>
                    <div className="text-[10px] leading-loose text-[var(--color-ink-dim)]">
                      Zone <span className="font-semibold text-[var(--color-ink)]">{c.geo.zone}</span>
                      <br />
                      Nearest station <span className="font-semibold text-[var(--color-ink)]">{c.geo.nearestStation}</span>
                      <br />
                      Cameras <span className="font-semibold text-[var(--color-teal)]">{c.geo.nearestCctv.slice(0, 4).join(', ')}</span>
                    </div>
                  </div>

                  {top && (
                    <div className="rounded-xl border p-4" style={{ borderColor: COLORS.saffron, background: 'rgba(244,122,42,0.06)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--color-ink)]">Cross-center candidate</span>
                        <span className="text-xl font-extrabold tabular-nums" style={{ color: COLORS.saffron }}>
                          {Math.round(top.score * 100)}%
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-ink-dim)]">{top.rationale}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => result && onResult(result)}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-[#1a1206] transition hover:brightness-105 active:translate-y-px"
                    style={{ background: COLORS.saffron }}
                  >
                    Hand to ops console <ArrowRight size={16} />
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--color-ink-dim)]">
                    <ShieldCheck size={12} style={{ color: COLORS.green }} />
                    A human operator must confirm any reunion.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-h-[62px] border-b border-r border-[var(--color-line-soft)] px-3.5 py-3">
      <div className="text-[9px] font-semibold text-[var(--color-ink-dim)]">{k}</div>
      <div className="mt-1 text-xs font-medium text-[var(--color-ink)]">{v}</div>
    </div>
  )
}
