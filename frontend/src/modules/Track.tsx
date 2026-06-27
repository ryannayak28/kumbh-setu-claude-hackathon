import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Clock3, Copy, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { getTrack } from '@/lib/api'
import type { TrackInfo } from '@/shared/types'

type Language = 'en' | 'hi'

const COPY = {
  en: {
    status: 'Case status',
    Reported: 'Report received',
    Pending: 'Searching every center',
    Matched: 'Possible match found',
    Reunited: 'Reunited',
    area: 'Search area',
    privacy: 'No names, phone numbers, or photos are shown on this page.',
    help: 'Need help?',
    helpText: 'Show this case ID at any Setu help desk or police station.',
    checking: 'Checking for updates…',
    updated: 'Updates automatically every 15 seconds',
    missing: 'We could not find that case. Check the case ID and try again.',
    copy: 'Copy case ID',
    copied: 'Copied',
  },
  hi: {
    status: 'मामले की स्थिति',
    Reported: 'रिपोर्ट मिल गई',
    Pending: 'सभी केंद्रों में खोज जारी',
    Matched: 'संभावित मिलान मिला',
    Reunited: 'परिवार से मिलाया गया',
    area: 'खोज क्षेत्र',
    privacy: 'इस पेज पर नाम, फ़ोन नंबर या फ़ोटो नहीं दिखाए जाते।',
    help: 'मदद चाहिए?',
    helpText: 'यह केस आईडी किसी भी सेतु सहायता केंद्र या पुलिस स्टेशन पर दिखाएँ।',
    checking: 'नई जानकारी देखी जा रही है…',
    updated: 'हर 15 सेकंड में स्थिति अपने-आप जाँची जाती है',
    missing: 'यह मामला नहीं मिला। केस आईडी जाँचकर दोबारा कोशिश करें।',
    copy: 'केस आईडी कॉपी करें',
    copied: 'कॉपी हो गया',
  },
} as const

export default function Track() {
  const { caseId = '' } = useParams()
  const [info, setInfo] = useState<TrackInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [refreshing, setRefreshing] = useState(true)
  const [copied, setCopied] = useState(false)
  const text = COPY[language]

  useEffect(() => {
    let active = true
    async function refresh() {
      setRefreshing(true)
      try {
        const next = await getTrack(caseId)
        if (!active) return
        setInfo(next)
        setError(null)
      } catch {
        if (active) setError(text.missing)
      } finally {
        if (active) setRefreshing(false)
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 15_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [caseId, text.missing])

  async function copyCaseId() {
    await navigator.clipboard.writeText(caseId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="min-h-full bg-[#f4f6f9] px-4 py-6 text-[#172033] sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#d85f16]" style={{ fontFamily: 'var(--font-deva)' }}>सेतु</span>
            <span className="text-lg font-bold">Setu</span>
          </div>
          <div className="flex rounded-lg border border-[#d8dee9] bg-white p-1 text-xs font-medium">
            <button type="button" onClick={() => setLanguage('en')} className="rounded-md px-2.5 py-1.5" style={{ background: language === 'en' ? '#172033' : 'transparent', color: language === 'en' ? 'white' : '#5c667c' }}>English</button>
            <button type="button" onClick={() => setLanguage('hi')} className="rounded-md px-2.5 py-1.5" style={{ background: language === 'hi' ? '#172033' : 'transparent', color: language === 'hi' ? 'white' : '#5c667c' }}>हिंदी</button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-[#efb6b8] bg-white p-5 text-center text-sm text-[#9f2429]">
            {error}
          </div>
        )}

        {info && (
          <section className="overflow-hidden rounded-xl bg-white shadow-[0_3px_8px_rgba(29,43,72,0.08)]">
            <div className="border-b border-[#e3e7ef] p-5 sm:p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#667085]">{text.status}</span>
                <button type="button" onClick={copyCaseId} aria-label={text.copy} className="flex items-center gap-1.5 rounded-md bg-[#f0f3f7] px-2.5 py-1.5 font-mono text-xs text-[#44506a] hover:bg-[#e5e9f0]">
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? text.copied : info.caseId}
                </button>
              </div>
              <h1 className="text-2xl font-bold tracking-[-0.02em]" style={{ color: info.stage === 'Reunited' ? '#17744b' : '#172033' }}>
                {text[info.stage as keyof typeof text] ?? info.stage}
              </h1>
            </div>

            <div className="p-5 sm:p-6">
              <ol className="relative ml-2 space-y-6 border-l border-[#cfd6e2] pl-7">
                {info.stages.map((stage) => {
                  const index = info.stages.indexOf(stage)
                  const current = info.stages.indexOf(info.stage)
                  const done = index <= current
                  const isNow = index === current
                  return (
                    <li key={stage} className="relative">
                      <span
                        className="absolute -left-[36px] flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                          background: done ? '#1f8a5b' : '#fff',
                          border: `1.5px solid ${done ? '#1f8a5b' : '#b9c2d1'}`,
                          boxShadow: isNow ? '0 0 0 4px rgba(31,138,91,0.12)' : 'none',
                        }}
                      >
                        {done && <Check size={12} color="white" strokeWidth={3} />}
                      </span>
                      <div className="text-sm font-semibold" style={{ color: done ? '#172033' : '#7d879b' }}>
                        {text[stage as keyof typeof text] ?? stage}
                      </div>
                    </li>
                  )
                })}
              </ol>

              <div className="mt-7 flex items-center gap-3 rounded-lg bg-[#eef8f7] px-3 py-3 text-sm text-[#3e5362]">
                <MapPin size={17} className="shrink-0 text-[#117c77]" />
                <span>{text.area}: <strong className="font-semibold text-[#172033]">{info.genericLocation}</strong></span>
              </div>

              <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#667085]">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#1f8a5b]" />
                <span>{text.privacy}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#e3e7ef] bg-[#f8f9fb] px-5 py-3 text-[11px] text-[#667085] sm:px-6">
              <span className="flex items-center gap-1.5">
                {refreshing ? <RefreshCw size={12} className="animate-spin" /> : <Clock3 size={12} />}
                {refreshing ? text.checking : text.updated}
              </span>
            </div>
          </section>
        )}

        {!info && !error && (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-[#667085] shadow-[0_3px_8px_rgba(29,43,72,0.08)]">
            <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-[#117c77]" />
            {text.checking}
          </div>
        )}

        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-[#172033]">{text.help}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#667085]">{text.helpText}</p>
        </div>
      </div>
    </main>
  )
}
