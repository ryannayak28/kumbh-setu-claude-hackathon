import { useEffect, useMemo, useState } from 'react'
import { Camera, CheckCircle2, Play, Search, Upload, X } from 'lucide-react'
import { createVideoJob, getVideoJob, getVideoResults, videoAssetUrl, type VideoResult } from '@/lib/videoApi'
import { COLORS } from '@/lib/theme'

type Props = {
  defaultDescription?: string
  onClose: () => void
}

export default function VideoSweep({ defaultDescription = '', onClose }: Props) {
  const [description, setDescription] = useState(defaultDescription)
  const [video, setVideo] = useState<File | null>(null)
  const [reference, setReference] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('ready')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<VideoResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const canSubmit = description.trim().length >= 10 && video && !jobId

  const helper = useMemo(() => {
    if (status === 'ready') return 'Upload a short POV clip when every center search has gone cold.'
    if (status === 'done') return 'Candidate sightings are for human review only.'
    if (status === 'error') return 'Video sweep could not complete.'
    return 'Sampling frames, detecting people, scoring likely sightings.'
  }, [status])

  useEffect(() => {
    if (!jobId || status === 'done' || status === 'error') return
    let active = true
    const timer = window.setInterval(async () => {
      try {
        const next = await getVideoJob(jobId)
        if (!active) return
        setStatus(next.status)
        setProgress(next.progress)
        if (next.status === 'error') setError(next.error || 'Video sweep failed.')
        if (next.status === 'done') {
          const data = await getVideoResults(jobId)
          if (active) setResults(data.results)
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not reach video sweep service.')
      }
    }, 1800)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [jobId, status])

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setStatus('queued')
    const form = new FormData()
    form.append('target_description', description.trim())
    form.append('video', video)
    if (reference) form.append('reference_image', reference)
    try {
      const created = await createVideoJob(form)
      setJobId(created.job_id)
    } catch (e) {
      setJobId(null)
      setStatus('ready')
      setError(e instanceof Error ? e.message : 'Could not start video sweep.')
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3">
      <div role="dialog" aria-modal="true" aria-labelledby="video-sweep-title" className="surface-sheen flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-line)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(24,166,154,0.12)] text-[var(--color-teal)]">
              <Camera size={19} />
            </span>
            <div>
              <h2 id="video-sweep-title" className="text-base font-extrabold text-[var(--color-ink)]">Last-mile video sweep</h2>
              <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-[var(--color-ink-dim)]">{helper}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close video sweep" className="rounded-lg bg-[var(--color-surface-2)] p-2 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4 border-b border-[var(--color-line)] p-5 md:border-b-0 md:border-r">
            <label className="block">
              <span className="text-xs font-bold text-[var(--color-ink)]">Person description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Example: elderly male, saffron shawl, rudraksha mala, speaks Maithili, last seen near Ramkund"
                className="mt-2 w-full resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-3 text-xs font-medium leading-relaxed text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-teal)]"
              />
            </label>

            <FilePick label="POV / event video" accept="video/*" file={video} onFile={setVideo} required />
            <FilePick label="Reference image (optional)" accept="image/*" file={reference} onFile={setReference} />

            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-extrabold text-[#1a1206] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: COLORS.saffron }}
            >
              <Search size={15} /> Trigger video search
            </button>
            {error && <p className="rounded-lg border border-[rgba(226,95,89,0.35)] bg-[rgba(226,95,89,0.1)] px-3 py-2 text-xs font-medium text-[var(--color-red)]">{error}</p>}
          </div>

          <div className="p-5">
            <div className="mb-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[var(--color-ink)]">{jobId ? `Job ${jobId.slice(0, 8)}` : 'No video search running'}</div>
                  <div className="mt-1 text-[10px] font-medium text-[var(--color-ink-dim)]">{status}</div>
                </div>
                <span className="text-lg font-extrabold tabular-nums text-[var(--color-teal)]">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div className="h-full rounded-full bg-[var(--color-teal)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>

            {results.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-bg)] p-6 text-center">
                <Upload size={22} className="text-[var(--color-ink-faint)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">Awaiting candidate sightings</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-ink-dim)]">Use this only after center records, family reports, and cross-center matches have no usable lead.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.slice(0, 4).map((result) => (
                  <div key={result.crop_id} className="flex gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
                    <img src={videoAssetUrl(result.thumbnail_url)} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--color-ink)]">Candidate #{result.rank} · {result.timestamp_label}</span>
                        <span className="text-sm font-extrabold text-[var(--color-saffron)]">{result.score}%</span>
                      </div>
                      <p className="mt-1 max-h-9 overflow-hidden text-[11px] font-medium leading-relaxed text-[var(--color-ink-dim)]">{result.reason}</p>
                      {result.clip_url && (
                        <a href={videoAssetUrl(result.clip_url)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-teal)]">
                          <Play size={11} /> Open clip
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-ink-dim)]">
                  <CheckCircle2 size={13} className="text-[var(--color-green)]" /> Human operator must verify before linking to a case.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilePick({
  label,
  accept,
  file,
  required,
  onFile,
}: {
  label: string
  accept: string
  file: File | null
  required?: boolean
  onFile: (file: File | null) => void
}) {
  return (
    <label className="block rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
      <span className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--color-ink)]">
        {label} {required && <span className="text-[10px] text-[var(--color-saffron)]">required</span>}
      </span>
      <input type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-[var(--color-ink-dim)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-surface-2)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--color-ink)]" />
      {file && <span className="mt-2 block truncate text-[10px] font-medium text-[var(--color-teal)]">{file.name}</span>}
    </label>
  )
}
