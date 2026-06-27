// Design tokens surfaced to JS (Leaflet styling, status colors, geocoding).
import type { LatLngExpression } from 'leaflet'
import type { Status } from '@/shared/types'

export const COLORS = {
  bg: '#0a0e1c',
  surface: '#121829',
  line: '#28324f',
  ink: '#e9edf8',
  inkDim: '#8893b4',
  saffron: '#ff8a3d',
  saffronDeep: '#e2671c',
  teal: '#34c8c2',
  green: '#3fb984',
  amber: '#e0a82e',
  red: '#e5484d',
} as const

export const STATUS_COLOR: Record<Status, string> = {
  Reported: COLORS.saffron,
  Pending: COLORS.amber,
  Matched: COLORS.saffron,
  Reunited: COLORS.green,
  Transferred: COLORS.teal,
  Unresolved: COLORS.red,
}

// Chokepoint colouring by where crowd density (and separations) peak.
export function chokepointColor(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('traffic') || c.includes('no-vehicle')) return COLORS.red
  if (c.includes('transfer')) return COLORS.saffron
  return COLORS.amber // parking / belts
}

// Approximate coordinates for the 10 reporting centers, spread across the
// Nashik–Trimbak extent. Used to draw the cross-center "bridge" arc — the
// literal closing of the "Center A invisible to Center B" gap.
export const CENTER_COORDS: Record<string, [number, number]> = {
  'Adgaon Kho-Ya-Paya': [20.0152, 73.8271],
  'Rajur Bahula Center': [19.9215, 73.7385],
  'Panchavati Center': [20.0072, 73.7903],
  'Ramkund Kho-Ya-Paya Kendra': [19.9967, 73.7898],
  'Bharat Bharati Control Room': [20.0035, 73.7536],
  'Trimbakeshwar Kho-Ya-Paya Kendra': [19.9402, 73.7205],
  'Central Control Room': [19.9985, 73.7805],
  'Nashik Road Center': [19.9462, 73.8351],
  'Sadhugram Lost Found': [20.0151, 73.7702],
  'Police Main Control Room': [20.0009, 73.7791],
  'Beacon (self-report)': [19.9967, 73.7898],
}

export function centerCoord(name: string): [number, number] | null {
  return CENTER_COORDS[name] ?? null
}

// Nashik geographic centre + sensible default zoom for the COP.
export const NASHIK_CENTER: LatLngExpression = [19.985, 73.79]
export const DEFAULT_ZOOM = 13

/**
 * Build a gently-arced poly-line (quadratic bezier) between two points so the
 * "bridge" reads as a span, not a straight wire. Returns [lat,lng] samples.
 */
export function arcPoints(
  a: [number, number],
  b: [number, number],
  bend = 0.22,
  steps = 48,
): [number, number][] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  // Perpendicular offset for the control point.
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const ctrl: [number, number] = [mid[0] - dy * bend, mid[1] + dx * bend]
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lat = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0]
    const lng = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]
    pts.push([lat, lng])
  }
  return pts
}
