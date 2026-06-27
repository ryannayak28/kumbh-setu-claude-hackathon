export type VideoJobStatus = {
  job_id: string
  status: 'queued' | 'extracting' | 'sheeting' | 'scoring' | 'clipping' | 'done' | 'error'
  stage: string
  progress: number
  counts: {
    sampled_frames: number
    person_crops: number
    contact_sheets: number
    scored_sheets: number
    results: number
  }
  error?: string | null
}

export type VideoResult = {
  rank: number
  crop_id: string
  score: number
  timestamp_label: string
  thumbnail_url: string
  clip_url: string | null
  frame_url: string
  reason: string
  matched_attributes: string[]
  missing_or_unclear_attributes: string[]
}

export type VideoResultsResponse = {
  job_id: string
  target_description: string
  scoring_provider: string | null
  scoring_model: string | null
  results: VideoResult[]
}

const VIDEO_API_BASE = import.meta.env.VITE_VIDEO_API_BASE_URL ?? '/video-api'

async function readJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = body?.detail ?? body?.message ?? res.statusText
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return body as T
}

export async function createVideoJob(form: FormData): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${VIDEO_API_BASE}/jobs`, { method: 'POST', body: form })
  return readJson(res)
}

export async function getVideoJob(jobId: string): Promise<VideoJobStatus> {
  const res = await fetch(`${VIDEO_API_BASE}/jobs/${jobId}`)
  return readJson(res)
}

export async function getVideoResults(jobId: string): Promise<VideoResultsResponse> {
  const res = await fetch(`${VIDEO_API_BASE}/jobs/${jobId}/results`)
  return readJson(res)
}

export function videoAssetUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = VIDEO_API_BASE.replace(/\/api$/, '')
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
