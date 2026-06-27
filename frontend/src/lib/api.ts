// Setu API client. The Vite dev server proxies /api to the FastAPI backend.
import type {
  Case,
  Geo,
  IntakeRequest,
  IntakeResponse,
  MatchCandidate,
  Stats,
  TrackInfo,
  FoundPerson,
} from '@/shared/types'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await errorMessage(res, `${url} failed (${res.status})`))
  return res.json()
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await errorMessage(res, `${url} failed (${res.status})`))
  }
  return res.json()
}

async function errorMessage(res: Response, fallback: string) {
  const raw = await res.text().catch(() => '')
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as { detail?: string | { msg?: string }[] }
    if (typeof parsed.detail === 'string') return parsed.detail
    if (Array.isArray(parsed.detail)) {
      return parsed.detail.map((item) => item.msg).filter(Boolean).join(' · ') || fallback
    }
  } catch {
    return raw
  }
  return fallback
}

export type Health = { status: string; model: string; model_ready: boolean }
export const getHealth = () => get<Health>('/api/health')

export const getGeo = () => get<Geo>('/api/geo')
export const getStats = () => get<Stats>('/api/stats')
export const getCases = () =>
  get<{ cases: Case[] }>('/api/cases').then((r) => r.cases)
export const getCase = (caseId: string, reveal = false) =>
  get<Case>(`/api/cases/${caseId}?reveal=${reveal}`)
export const getFound = () => get<{ found: FoundPerson[] }>('/api/found').then((r) => r.found)
export const getTrack = (caseId: string) => get<TrackInfo>(`/api/track/${caseId}`)

export const postIntake = (body: IntakeRequest) => post<IntakeResponse>('/api/intake', body)
export const postMatch = (caseId: string) =>
  post<{ caseId: string; engine: string; candidates: MatchCandidate[] }>(`/api/match/${caseId}`, {})
export const confirmReunify = (caseId: string, foundId: string) =>
  post<{ ok: boolean; case: Case }>('/api/reunify/confirm', { caseId, foundId })
export const closeCase = (caseId: string) =>
  post<{ ok: boolean; case: Case }>('/api/cases/close', { caseId })
