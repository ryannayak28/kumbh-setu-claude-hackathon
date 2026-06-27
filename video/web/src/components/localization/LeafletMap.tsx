"use client";

import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { CandidateLocation, EventHint } from "@/types/localization";

export function LeafletMap({
  locations,
  eventHint,
}: {
  locations: CandidateLocation[];
  eventHint: EventHint;
}) {
  const center = locations[0]
    ? { lat: locations[0].lat, lng: locations[0].lng }
    : eventHint.approx_center ?? { lat: 19.9696921, lng: 73.6616225 };

  return (
    <div className="h-[420px]">
      <MapContainer center={[center.lat, center.lng]} className="h-full w-full" scrollWheelZoom={false} zoom={14}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((location) => (
          <div key={location.candidate_location_id}>
            <Circle
              center={[location.lat, location.lng]}
              pathOptions={{ color: "#0f766e", fillColor: "#5eead4", fillOpacity: 0.12, weight: 2 }}
              radius={location.radius_m}
            />
            <CircleMarker
              center={[location.lat, location.lng]}
              pathOptions={{ color: "#0b4f49", fillColor: "#0f766e", fillOpacity: 0.9, weight: 2 }}
              radius={9}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{location.name}</div>
                  <div>Relation: {Math.round((location.zone_relation_score ?? location.confidence) * 100)}%</div>
                  <div>Radius: {location.radius_m}m</div>
                  {location.map_url ? (
                    <a href={location.map_url} rel="noreferrer" target="_blank">
                      Open external map
                    </a>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}
