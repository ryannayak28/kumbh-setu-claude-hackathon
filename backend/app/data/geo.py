"""Geo helpers: snap a last-seen string to a zone, find nearest CCTV / station /
chokepoints. Used by intake to produce a GeoResolution (PLAN.md §2.2)."""
from __future__ import annotations

import math

from app.models import Geo, GeoResolution

# Named last-seen locations the dataset uses, mapped to rough lat/lng so a free-text
# "near Ramkund" resolves onto the map. Coords sit inside the Nashik extent
# (lat 19.90–20.08, lng 73.71–73.88). Approximate but demo-stable.
LANDMARKS: dict[str, tuple[float, float]] = {
    "ramkund": (19.9967, 73.7898),
    "ramkund ghat": (19.9967, 73.7898),
    "trimbak": (19.9320, 73.5300),
    "trimbakeshwar": (19.9320, 73.5300),
    "trimbakeshwar approach": (19.9400, 73.5600),
    "trimbak road": (19.9700, 73.7200),
    "sadhugram": (20.0150, 73.7700),
    "sadhugram gate 2": (20.0160, 73.7710),
    "madsangvi": (20.0050, 73.8400),
    "madsangvi transit": (20.0050, 73.8400),
    "nashik road": (19.9460, 73.8350),
    "nashik road station": (19.9460, 73.8350),
    "gauri patangan": (19.9980, 73.7850),
    "dasak ghat": (19.9700, 73.8200),
    "dasak": (19.9700, 73.8200),
    "adgaon": (20.0150, 73.8270),
    "adgaon parking": (20.0150, 73.8270),
    "nandur ghat": (20.0300, 73.8500),
    "laxmi narayan ghat": (19.9950, 73.7900),
    "takli sangam": (19.9550, 73.8100),
    "bus stand nashik": (19.9980, 73.7780),
    "panchavati": (20.0070, 73.7900),
    "kalaram": (20.0080, 73.7920),
    "gangapur": (20.0100, 73.7300),
}


def _haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))  # km


def resolve_latlng(last_seen: str, geo: Geo) -> tuple[float, float]:
    """Best-effort: match a known landmark; else snap onto the nearest zone centroid;
    else fall back to the geographic center of Nashik."""
    key = (last_seen or "").strip().lower()
    if key in LANDMARKS:
        return LANDMARKS[key]
    for name, coord in LANDMARKS.items():
        if name in key or key in name:
            return coord
    if geo.zones:
        z = geo.zones[len(geo.zones) // 2]
        return (z.lat, z.lng)
    return (19.99, 73.79)


def _nearest_zone(lat: float, lng: float, geo: Geo) -> str:
    if not geo.zones:
        return "Unknown Zone"
    # Prefer polygon containment via the loader's assignment proxy: nearest centroid.
    best = min(geo.zones, key=lambda z: _haversine((lat, lng), (z.lat, z.lng)))
    return best.name


def resolve(last_seen: str, geo: Geo, *, n_cctv: int = 4, n_choke: int = 3) -> GeoResolution:
    lat, lng = resolve_latlng(last_seen, geo)
    zone = _nearest_zone(lat, lng, geo)
    z = next((z for z in geo.zones if z.name == zone), None)

    cctv = sorted(geo.cctv, key=lambda c: _haversine((lat, lng), (c.lat, c.lng)))[:n_cctv]
    station = min(geo.stations, key=lambda s: _haversine((lat, lng), (s.lat, s.lng))) \
        if geo.stations else None
    chokes = sorted(geo.chokepoints, key=lambda c: _haversine((lat, lng), (c.lat, c.lng)))[:n_choke]

    return GeoResolution(
        zone=zone,
        zoneCentroid=[z.lat, z.lng] if z else [lat, lng],
        lastSeenLatLng=[lat, lng],
        nearestCctv=[c.id for c in cctv],
        nearestStation=station.name if station else "",
        nearbyChokepoints=[c.name for c in chokes],
    )
