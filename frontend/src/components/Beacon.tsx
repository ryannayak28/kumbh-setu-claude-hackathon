import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, X, MapPin, MessageSquare, ArrowRight } from 'lucide-react'
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
  const [text, setText] = useState('')
  const [center, setCenter] = useState('Nashik Road Center')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IntakeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const r = await postIntake({ rawText: text, channel: 'whatsapp', reportingCenter: center, consent: true })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Intake failed')
    } finally {
      setLoading(false)
    }
  }

  const c = result?.case
  const top = result?.candidates?.[0]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(4,7,16,0.7)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="panel grid w-full max-w-4xl overflow-hidden rounded-2xl md:grid-cols-2"
        style={{ maxHeight: '88vh' }}
      >
        {/* Left — the pilgrim's channel (no app, just a message) */}
        <div className="flex flex-col border-r border-[var(--color-line)]" style={{ background: COLORS.bg }}>
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} style={{ color: COLORS.teal }} />
              <span className="text-sm font-semibold">Beacon intake</span>
              <span className="eyebrow">whatsapp / sms · no app</span>
            </div>
            <button onClick={onClose} className="text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <p className="eyebrow">Try a real-world report</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setText(s.text)
                    setCenter(s.center)
                    setResult(null)
                  }}
                  className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)] transition hover:border-[var(--color-teal)] hover:text-[var(--color-ink)]"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {text && (
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm" style={{ background: COLORS.surface }}>
                {text}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-line)] p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="eyebrow">reporting at</span>
              <select
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                className="mono flex-1 rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-ink)]"
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
                className="flex-1 resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-teal)]"
              />
              <button
                onClick={submit}
                disabled={loading || !text.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40"
                style={{ background: COLORS.saffron, color: '#1a1206' }}
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Right — what Claude makes of it */}
        <div className="flex flex-col" style={{ background: COLORS.surface }}>
          <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
            <Sparkles size={16} style={{ color: COLORS.saffron }} />
            <span className="text-sm font-semibold">Claude normalises the report</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!result && !loading && (
              <p className="mt-8 text-center text-sm text-[var(--color-ink-dim)]">
                Pick a sample or type a report, then send.
                <br />
                Claude extracts, translates and geo-resolves it.
              </p>
            )}
            {loading && (
              <div className="mt-10 flex flex-col items-center gap-3 text-sm text-[var(--color-ink-dim)]">
                <Sparkles className="animate-pulse" style={{ color: COLORS.saffron }} />
                Reading the report, resolving location, searching every center…
              </div>
            )}
            {error && <p className="mt-6 text-sm" style={{ color: COLORS.red }}>{error}</p>}

            <AnimatePresence>
              {c && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="mono text-sm text-[var(--color-ink)]">{c.id}</span>
                    <span className="eyebrow">extracted by {result?.extractedBy}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Field k="Gender" v={c.gender} />
                    <Field k="Age band" v={c.ageBand} />
                    <Field k="Language" v={c.language ?? '—'} />
                    <Field k="Last seen" v={c.lastSeenLocation || '—'} />
                  </div>
                  <div className="rounded-lg border border-[var(--color-line)] p-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <MapPin size={13} style={{ color: COLORS.teal }} />
                      <span className="eyebrow">geo-resolved</span>
                    </div>
                    <div className="mono text-xs leading-relaxed text-[var(--color-ink-dim)]">
                      zone <span className="text-[var(--color-ink)]">{c.geo.zone}</span>
                      <br />
                      nearest station <span className="text-[var(--color-ink)]">{c.geo.nearestStation}</span>
                      <br />
                      cameras <span className="text-[var(--color-teal)]">{c.geo.nearestCctv.slice(0, 4).join(', ')}</span>
                    </div>
                  </div>

                  {top && (
                    <div className="rounded-lg border p-3" style={{ borderColor: COLORS.saffron, background: 'rgba(255,138,61,0.06)' }}>
                      <div className="flex items-baseline gap-2">
                        <span className="mono text-xl font-semibold" style={{ color: COLORS.saffron }}>
                          {Math.round(top.score * 100)}%
                        </span>
                        <span className="text-sm">cross-center match found</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-ink-dim)]">{top.rationale}</p>
                    </div>
                  )}

                  <button
                    onClick={() => result && onResult(result)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-[#1a1206]"
                    style={{ background: COLORS.saffron }}
                  >
                    Hand to ops console <ArrowRight size={16} />
                  </button>
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
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2">
      <div className="eyebrow">{k}</div>
      <div className="text-sm text-[var(--color-ink)]">{v}</div>
    </div>
  )
}
