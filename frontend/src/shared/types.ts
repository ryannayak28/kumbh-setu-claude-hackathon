// Mirrors backend/app/models.py. Kept in sync by hand (hackathon scope).

export type AgeBand = '0-12' | '13-17' | '18-40' | '41-60' | '61-70' | '71-80' | '80+'
export type Status = 'Reported' | 'Pending' | 'Matched' | 'Reunited' | 'Transferred' | 'Unresolved'
export type Channel = 'whatsapp' | 'web' | 'operator' | 'kiosk'
export type Gender = 'Male' | 'Female' | 'Unknown'

export interface PII {
  name?: string | null
  mobile?: string | null
  photoUrl?: string | null
  physicalDescription?: string | null
  consent: boolean
  purgedAt?: string | null
}

export interface GeoResolution {
  zone: string
  zoneCentroid?: [number, number] | null
  lastSeenLatLng?: [number, number] | null
  nearestCctv: string[]
  nearestStation: string
  nearbyChokepoints: string[]
}

export interface Case {
  id: string
  reportedAt: string
  channel: Channel
  gender: Gender
  ageBand: AgeBand
  state?: string | null
  district?: string | null
  language?: string | null
  lastSeenLocation: string
  reportingCenter: string
  status: Status
  geo: GeoResolution
  pii: PII
  linkedFoundId?: string | null
  resolutionHours?: number | null
  remarks?: string | null
}

export interface FoundPerson {
  id: string
  foundAt: string
  center: string
  gender: Gender
  ageBand: AgeBand
  language?: string | null
  observedLocation: string
  note?: string | null
  matchedCaseId?: string | null
  approxName?: string | null
}

export interface MatchCandidate {
  foundId: string
  score: number
  rationale: string
  fieldsMatched: string[]
  tier: 'auto' | 'review'
  found?: FoundPerson | null
}

export interface CctvPoint { id: string; lat: number; lng: number; zone: string }
export interface StationPoint { name: string; lat: number; lng: number }
export interface Chokepoint { name: string; category: string; lat: number; lng: number; risk?: string | null }
export interface ZonePoly { name: string; lat: number; lng: number; polygon: [number, number][] }

export interface Geo {
  cctv: CctvPoint[]
  stations: StationPoint[]
  chokepoints: Chokepoint[]
  zones: ZonePoly[]
}

export interface Stats {
  total: number
  reunited: number
  pending: number
  transferred: number
  unresolved: number
  medianHours: number
  maxHours: number
  meanHours: number
  crossCenterDuplicates: number
  duplicatePct: number
  noName: number
  noMobile: number
  elderly: number
  elderlyPct: number
  languages: number
  topLanguages: Record<string, number>
  unresolvedPct: number
}

export interface IntakeRequest {
  rawText?: string
  channel?: Channel
  name?: string
  mobile?: string
  gender?: Gender
  ageBand?: AgeBand
  language?: string
  lastSeenLocation?: string
  reportingCenter?: string
  consent?: boolean
}

export interface IntakeResponse {
  case: Case
  candidates: MatchCandidate[]
  extractedBy: 'claude' | 'heuristic'
  trackUrl: string
}

export interface TrackInfo {
  caseId: string
  stage: Status
  stages: Status[]
  genericLocation: string
  reportedAt: string
  updated: boolean
}
