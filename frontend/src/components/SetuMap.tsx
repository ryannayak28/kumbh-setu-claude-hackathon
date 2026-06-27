import { useEffect, useMemo, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Polyline,
  useMap,
  Tooltip,
} from 'react-leaflet'
import L from 'leaflet'
import type { Case, Geo } from '@/shared/types'
import {
  COLORS,
  STATUS_COLOR,
  chokepointColor,
  NASHIK_CENTER,
  DEFAULT_ZOOM,
  arcPoints,
} from '@/lib/theme'

export interface LayerFlags {
  zones: boolean
  cctv: boolean
  police: boolean
  chokepoints: boolean
  cases: boolean
}

export interface Bridge {
  from: [number, number]
  to: [number, number]
}

interface Props {
  geo: Geo
  cases: Case[]
  layers: LayerFlags
  selectedCaseId?: string | null
  flyTo?: [number, number] | null
  bridge?: Bridge | null
  livePin?: [number, number] | null
  onSelectCase?: (c: Case) => void
}

/** Heavy CCTV layer (~4,000 points) drawn imperatively on a canvas renderer —
 *  far cheaper than thousands of React markers. */
function CctvLayer({ geo, visible }: { geo: Geo; visible: boolean }) {
  const map = useMap()
  const groupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const renderer = L.canvas({ padding: 0.5 })
    const group = L.layerGroup()
    for (const c of geo.cctv) {
      L.circleMarker([c.lat, c.lng], {
        renderer,
        radius: 1.4,
        color: COLORS.teal,
        weight: 0,
        fillColor: COLORS.teal,
        fillOpacity: 0.45,
      }).addTo(group)
    }
    groupRef.current = group
    return () => {
      group.remove()
    }
  }, [geo, map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    if (visible) group.addTo(map)
    else group.remove()
  }, [visible, map, geo])

  return null
}

function FlyController({ to, zoom }: { to?: [number, number] | null; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    if (to) map.flyTo(to, zoom ?? 15, { duration: 1.1 })
  }, [to, zoom, map])
  return null
}

/** Animated saffron span connecting two centers — the "setu" (bridge). */
function BridgeArc({ bridge }: { bridge: Bridge }) {
  const pts = useMemo(() => arcPoints(bridge.from, bridge.to), [bridge])
  const ref = useRef<L.Polyline | null>(null)
  useEffect(() => {
    const el = ref.current?.getElement() as SVGPathElement | undefined
    if (!el) return
    const len = el.getTotalLength()
    el.style.transition = 'none'
    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`
    el.style.filter = 'drop-shadow(0 0 6px rgba(255,138,61,0.9))'
    // force reflow then animate the draw
    void el.getBoundingClientRect()
    el.style.transition = 'stroke-dashoffset 1.2s ease-out'
    el.style.strokeDashoffset = '0'
  }, [bridge])
  return (
    <>
      <Polyline ref={ref} positions={pts} pathOptions={{ color: COLORS.saffron, weight: 3, opacity: 0.95 }} />
      <CircleMarker center={bridge.from} radius={6} pathOptions={{ color: COLORS.saffron, fillColor: COLORS.saffron, fillOpacity: 1, weight: 2 }} />
      <CircleMarker center={bridge.to} radius={6} pathOptions={{ color: COLORS.saffron, fillColor: COLORS.saffron, fillOpacity: 1, weight: 2 }} />
    </>
  )
}

export default function SetuMap({
  geo,
  cases,
  layers,
  selectedCaseId,
  flyTo,
  bridge,
  livePin,
  onSelectCase,
}: Props) {
  return (
    <MapContainer
      center={NASHIK_CENTER}
      zoom={DEFAULT_ZOOM}
      preferCanvas
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />

      {layers.zones &&
        geo.zones
          .filter((z) => z.polygon.length > 2)
          .map((z) => (
            <Polygon
              key={z.name}
              positions={z.polygon}
              pathOptions={{ color: COLORS.line, weight: 1, fillColor: COLORS.teal, fillOpacity: 0.04 }}
            />
          ))}

      <CctvLayer geo={geo} visible={layers.cctv} />

      {layers.police &&
        geo.stations.map((s) => (
          <CircleMarker
            key={s.name}
            center={[s.lat, s.lng]}
            radius={4}
            pathOptions={{ color: '#7aa2ff', fillColor: '#7aa2ff', fillOpacity: 0.9, weight: 1 }}
          >
            <Tooltip>{s.name}</Tooltip>
          </CircleMarker>
        ))}

      {layers.chokepoints &&
        geo.chokepoints.map((c, i) => (
          <CircleMarker
            key={`${c.name}-${i}`}
            center={[c.lat, c.lng]}
            radius={3.5}
            pathOptions={{ color: chokepointColor(c.category), fillColor: chokepointColor(c.category), fillOpacity: 0.7, weight: 0 }}
          >
            <Tooltip>
              {c.name} — {c.category}
              {c.risk ? ` · risk: ${c.risk}` : ''}
            </Tooltip>
          </CircleMarker>
        ))}

      {layers.cases &&
        cases.map((c) => {
          const ll = c.geo.lastSeenLatLng
          if (!ll) return null
          const selected = c.id === selectedCaseId
          return (
            <CircleMarker
              key={c.id}
              center={ll}
              radius={selected ? 9 : 5}
              pathOptions={{
                color: STATUS_COLOR[c.status],
                fillColor: STATUS_COLOR[c.status],
                fillOpacity: selected ? 0.95 : 0.7,
                weight: selected ? 3 : 1,
              }}
              eventHandlers={{ click: () => onSelectCase?.(c) }}
            >
              <Tooltip>
                {c.id} · {c.status} · {c.ageBand} {c.gender}
              </Tooltip>
            </CircleMarker>
          )
        })}

      {livePin && (
        <CircleMarker
          center={livePin}
          radius={10}
          pathOptions={{ color: COLORS.saffron, fillColor: COLORS.saffron, fillOpacity: 0.9, weight: 3 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            New report
          </Tooltip>
        </CircleMarker>
      )}

      {bridge && <BridgeArc bridge={bridge} />}

      <FlyController to={flyTo} zoom={bridge ? 13 : 15} />
    </MapContainer>
  )
}
