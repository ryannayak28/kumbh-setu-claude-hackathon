"""Parse the KML geo pack (authoritative) with CSV fallback → an in-memory Geo.

KML files (hackathon-data/data-kml):
  - "CCTV Dataset.kml"        : zone polygons (Placemark/Polygon, name "Zone Area N")
                                + ~4,000 camera points (Placemark/Point, "Z1-C3"/"C-0010")
  - "Police Stations.kml"     : 14 station points
  - "nashik_kumbh_chokepoints_parking_map.kml": 85 chokepoints, Category in <description>

CSV fallback (hackathon-data/data):
  - Zone_Boundaries.csv, CCTV_Locations.csv, Police_Stations.csv, Chokepoints_Parking.csv
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

try:
    # Hardened against XXE / billion-laughs. Falls back to stdlib if absent
    # (KML here is local, author-controlled data, so the demo never breaks).
    import defusedxml.ElementTree as ET
except ImportError:  # pragma: no cover
    import xml.etree.ElementTree as ET

from app.config import DATA_DIR, DATA_DIR_FALLBACK
from app.models import CctvPoint, Chokepoint, Geo, StationPoint, ZonePoly


def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[-1]


def _iter_placemarks(path: Path):
    """Yield (name, description, element) for every <Placemark>, namespace-agnostic."""
    tree = ET.parse(path)
    for el in tree.iter():
        if _strip_ns(el.tag) != "Placemark":
            continue
        name, desc = None, None
        for child in el:
            t = _strip_ns(child.tag)
            if t == "name":
                name = (child.text or "").strip()
            elif t == "description":
                desc = (child.text or "").strip()
        yield name, desc, el


def _find(el, tag: str):
    for sub in el.iter():
        if _strip_ns(sub.tag) == tag:
            return sub
    return None


def _parse_coord_string(text: str) -> list[list[float]]:
    """KML coords are 'lng,lat,alt lng,lat,alt ...' → list of [lat, lng]."""
    pts: list[list[float]] = []
    for tok in (text or "").replace("\n", " ").split():
        parts = tok.split(",")
        if len(parts) >= 2:
            lng, lat = float(parts[0]), float(parts[1])
            pts.append([lat, lng])
    return pts


def _centroid(poly: list[list[float]]) -> tuple[float, float]:
    if not poly:
        return (0.0, 0.0)
    lat = sum(p[0] for p in poly) / len(poly)
    lng = sum(p[1] for p in poly) / len(poly)
    return (lat, lng)


def _point_in_poly(lat: float, lng: float, poly: list[list[float]]) -> bool:
    """Ray-casting. poly is [[lat,lng],...]."""
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        yi, xi = poly[i][0], poly[i][1]
        yj, xj = poly[j][0], poly[j][1]
        if ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def _load_zones_kml(cctv_kml: Path) -> list[ZonePoly]:
    zones: list[ZonePoly] = []
    for name, _desc, el in _iter_placemarks(cctv_kml):
        poly_el = _find(el, "Polygon")
        if poly_el is None:
            continue
        coord_el = _find(poly_el, "coordinates")
        poly = _parse_coord_string(coord_el.text if coord_el is not None else "")
        if not poly:
            continue
        clat, clng = _centroid(poly)
        zones.append(ZonePoly(name=name or f"Zone {len(zones)+1}", lat=clat, lng=clng, polygon=poly))
    return zones


def _load_points_kml(path: Path):
    """Yield (name, description, lat, lng) for point placemarks."""
    for name, desc, el in _iter_placemarks(path):
        pt = _find(el, "Point")
        if pt is None:
            continue
        coord_el = _find(pt, "coordinates")
        coords = _parse_coord_string(coord_el.text if coord_el is not None else "")
        if not coords:
            continue
        lat, lng = coords[0]
        yield name, desc, lat, lng


def _assign_zone(lat: float, lng: float, zones: list[ZonePoly]) -> str:
    for z in zones:
        if z.polygon and _point_in_poly(lat, lng, z.polygon):
            return z.name
    # Fallback: nearest centroid.
    if not zones:
        return ""
    best = min(zones, key=lambda z: (z.lat - lat) ** 2 + (z.lng - lng) ** 2)
    return best.name


def _risk_from_desc(desc: str | None) -> str | None:
    if not desc:
        return None
    m = re.search(r"Risk:\s*([^|]+)", desc)
    return m.group(1).strip() if m else None


def _category_from_desc(desc: str | None) -> str:
    if not desc:
        return "Chokepoint"
    m = re.search(r"Category:\s*([^|]+)", desc)
    return m.group(1).strip() if m else "Chokepoint"


# --- CSV fallbacks -------------------------------------------------------


def _load_zones_csv(path: Path) -> list[ZonePoly]:
    zones: list[ZonePoly] = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            zones.append(
                ZonePoly(
                    name=row["zone_name"],
                    lat=float(row["centroid_lat"]),
                    lng=float(row["centroid_lng"]),
                    polygon=[],
                )
            )
    return zones


def load_geo() -> Geo:
    """Build the geographic backbone. Prefers KML; degrades to CSV per-layer."""
    cctv_kml = DATA_DIR / "CCTV Dataset.kml"
    police_kml = DATA_DIR / "Police Stations.kml"
    choke_kml = DATA_DIR / "nashik_kumbh_chokepoints_parking_map.kml"

    # Zones: KML polygons (rich) → else CSV centroids.
    zones: list[ZonePoly] = []
    if cctv_kml.exists():
        zones = _load_zones_kml(cctv_kml)
    if not zones:
        zcsv = DATA_DIR / "Zone_Boundaries.csv"
        if not zcsv.exists():
            zcsv = DATA_DIR_FALLBACK / "Zone_Boundaries.csv"
        if zcsv.exists():
            zones = _load_zones_csv(zcsv)

    # CCTV points from KML (skip the polygon placemarks, which have no Point).
    cctv: list[CctvPoint] = []
    if cctv_kml.exists():
        for name, _desc, lat, lng in _load_points_kml(cctv_kml):
            cctv.append(
                CctvPoint(id=name or f"C-{len(cctv)+1}", lat=lat, lng=lng,
                          zone=_assign_zone(lat, lng, zones))
            )
    elif (DATA_DIR_FALLBACK / "CCTV_Locations.csv").exists():
        with open(DATA_DIR_FALLBACK / "CCTV_Locations.csv", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                lat, lng = float(row["latitude"]), float(row["longitude"])
                cctv.append(CctvPoint(id=row["camera_id"], lat=lat, lng=lng,
                                      zone=_assign_zone(lat, lng, zones)))

    # Police stations.
    stations: list[StationPoint] = []
    if police_kml.exists():
        for name, _desc, lat, lng in _load_points_kml(police_kml):
            stations.append(StationPoint(name=name or "Police Station", lat=lat, lng=lng))
    elif (DATA_DIR_FALLBACK / "Police_Stations.csv").exists():
        with open(DATA_DIR_FALLBACK / "Police_Stations.csv", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                stations.append(StationPoint(name=row["station_name"],
                                             lat=float(row["latitude"]),
                                             lng=float(row["longitude"])))

    # Chokepoints (category + risk live in the KML description).
    chokepoints: list[Chokepoint] = []
    if choke_kml.exists():
        for name, desc, lat, lng in _load_points_kml(choke_kml):
            chokepoints.append(
                Chokepoint(name=name or "Chokepoint", category=_category_from_desc(desc),
                           lat=lat, lng=lng, risk=_risk_from_desc(desc))
            )
    elif (DATA_DIR_FALLBACK / "Chokepoints_Parking.csv").exists():
        with open(DATA_DIR_FALLBACK / "Chokepoints_Parking.csv", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                chokepoints.append(Chokepoint(name=row["location_name"], category=row["category"],
                                              lat=float(row["latitude"]), lng=float(row["longitude"])))

    return Geo(cctv=cctv, stations=stations, chokepoints=chokepoints, zones=zones)
