import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import { STATUS_COLORS, type DeliveryStatusValue, type House, type Zone } from "../lib/types";
import { zoneColor } from "../lib/colors";
import type { GeoPosition } from "../hooks/useGeolocation";
import type { LatLng } from "../lib/geo";

const RENTON_WA: LatLngTuple = [47.4829, -122.2171];

function houseIcon(fill: string, status: DeliveryStatusValue, isTarget: boolean) {
  const ring = isTarget ? "#2563eb" : STATUS_COLORS[status];
  const ringWidth = isTarget ? 4 : status === "delivered" ? 3.5 : 2;
  return L.divIcon({
    className: "house-div-icon",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${fill};border:${ringWidth}px solid ${ring};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function meIcon() {
  return L.divIcon({
    className: "me-div-icon",
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/** Fits to every point exactly once, the first time positions become available (they load async). */
function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || positions.length === 0) return;
    if (positions.length === 1) map.setView(positions[0], 17);
    else map.fitBounds(positions, { padding: [24, 24], maxZoom: 18 });
    didFit.current = true;
  }, [positions, map]);
  return null;
}

interface Props {
  houses: (House & LatLng)[];
  zones: Zone[];
  statusByHouse: Map<number, DeliveryStatusValue>;
  targetId: number | null;
  here: GeoPosition | null;
  onSelectHouse: (id: number) => void;
}

/** Read-only mini-map for delivery mode: shows the volunteer's houses, their live GPS position, and lets them tap a pin to make it the current target. */
export function DeliveryMap({ houses, zones, statusByHouse, targetId, here, onSelectHouse }: Props) {
  const zoneColorById = useMemo(() => new Map(zones.map((z) => [z.id, z.color])), [zones]);
  const positions = useMemo<LatLngTuple[]>(() => {
    const pts = houses.map((h) => [h.lat, h.lng] as LatLngTuple);
    return here ? [...pts, [here.lat, here.lng] as LatLngTuple] : pts;
  }, [houses, here]);

  return (
    <div className="delivery-map-wrap">
      <MapContainer center={positions[0] ?? RENTON_WA} zoom={16} className="delivery-map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {houses.map((house) => (
          <Marker
            key={house.id}
            position={[house.lat, house.lng]}
            icon={houseIcon(
              zoneColor(house.zone_id, zoneColorById.get(house.zone_id ?? -1)),
              statusByHouse.get(house.id) ?? "not_started",
              house.id === targetId
            )}
            eventHandlers={{ click: () => onSelectHouse(house.id) }}
          />
        ))}
        {here && <Marker position={[here.lat, here.lng]} icon={meIcon()} />}
      </MapContainer>
    </div>
  );
}
