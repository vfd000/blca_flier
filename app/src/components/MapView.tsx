import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { STATUS_COLORS, type DeliveryStatusValue, type House } from "../lib/types";
import { HousePanel } from "./HousePanel";

const RENTON_WA: LatLngTuple = [47.4829, -122.2171];

function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(positions, { padding: [24, 24], maxZoom: 17 });
    // Only refit when the number of plotted houses changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length]);
  return null;
}

function PlacementListener({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  houses: House[];
  statusByHouse: Map<number, DeliveryStatusValue>;
  canEditHouse: (house: House) => boolean;
  onSetStatus: (houseId: number, status: DeliveryStatusValue) => void;
  isAdmin: boolean;
  placingHouseId: number | null;
  onPlaceHouse: (houseId: number, lat: number, lng: number) => void;
}

export function MapView({
  houses,
  statusByHouse,
  canEditHouse,
  onSetStatus,
  isAdmin,
  placingHouseId,
  onPlaceHouse,
}: Props) {
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);

  const placed = useMemo(() => houses.filter((h) => h.lat != null && h.lng != null), [houses]);
  const positions = useMemo<LatLngTuple[]>(() => placed.map((h) => [h.lat as number, h.lng as number]), [placed]);
  const selectedHouse = houses.find((h) => h.id === selectedHouseId) ?? null;

  return (
    <div className="map-wrap">
      <MapContainer center={RENTON_WA} zoom={15} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {isAdmin && placingHouseId != null && (
          <PlacementListener onPlace={(lat, lng) => onPlaceHouse(placingHouseId, lat, lng)} />
        )}
        {placed.map((house) => {
          const status = statusByHouse.get(house.id) ?? "not_started";
          return (
            <CircleMarker
              key={house.id}
              center={[house.lat as number, house.lng as number]}
              radius={8}
              pathOptions={{
                color: "#1f2937",
                weight: 1,
                fillColor: STATUS_COLORS[status],
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => setSelectedHouseId(house.id) }}
            />
          );
        })}
      </MapContainer>
      {selectedHouse && (
        <HousePanel
          house={selectedHouse}
          status={statusByHouse.get(selectedHouse.id) ?? "not_started"}
          canEdit={canEditHouse(selectedHouse)}
          onSetStatus={(status) => onSetStatus(selectedHouse.id, status)}
          onClose={() => setSelectedHouseId(null)}
        />
      )}
    </div>
  );
}
