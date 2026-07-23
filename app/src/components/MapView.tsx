import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import { STATUS_COLORS, type DeliveryStatusValue, type House } from "../lib/types";
import { HousePanel } from "./HousePanel";

const RENTON_WA: LatLngTuple = [47.4829, -122.2171];

export type MapEditMode = "view" | "reposition" | "add" | "select";

function houseIcon(color: string, selected: boolean) {
  const ring = selected ? "#2563eb" : "#1f2937";
  const ringWidth = selected ? 3 : 1.5;
  return L.divIcon({
    className: "house-div-icon",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:${ringWidth}px solid ${ring};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

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

/** Click-to-place: used both for placing a specific unplaced house and for adding a brand-new one. */
function MapClickListener({ active, onClick }: { active: boolean; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (active) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Drag a rectangle to select every placed house inside it. Disables map panning while dragging. */
function RectSelectTool({
  active,
  houses,
  onSelect,
}: {
  active: boolean;
  houses: House[];
  onSelect: (ids: Set<number>) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const container = map.getContainer();
    let rect: L.Rectangle | null = null;
    let start: L.LatLng | null = null;

    const onMouseMove = (e: MouseEvent) => {
      if (!rect || !start) return;
      rect.setBounds(L.latLngBounds(start, map.mouseEventToLatLng(e)));
    };
    const finish = (e: MouseEvent) => {
      if (rect && start) {
        const bounds = L.latLngBounds(start, map.mouseEventToLatLng(e));
        const ids = new Set(
          houses
            .filter((h) => h.lat != null && h.lng != null && bounds.contains([h.lat, h.lng]))
            .map((h) => h.id)
        );
        onSelect(ids);
        map.removeLayer(rect);
      }
      rect = null;
      start = null;
      map.dragging.enable();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", finish);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      map.dragging.disable();
      start = map.mouseEventToLatLng(e);
      rect = L.rectangle(L.latLngBounds(start, start), { color: "#2563eb", weight: 1, fillOpacity: 0.1 }).addTo(map);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", finish);
    };

    container.addEventListener("mousedown", onMouseDown);
    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", finish);
      if (rect) map.removeLayer(rect);
      map.dragging.enable();
    };
  }, [active, houses, map, onSelect]);
  return null;
}

interface Props {
  houses: House[];
  statusByHouse: Map<number, DeliveryStatusValue>;
  canEditHouse: (house: House) => boolean;
  onSetStatus: (houseId: number, status: DeliveryStatusValue) => void;
  isAdmin: boolean;
  editMode: MapEditMode;
  placingHouseId: number | null;
  onPlaceHouse: (houseId: number, lat: number, lng: number) => void;
  onAddHouseAt: (lat: number, lng: number) => void;
  selectedHouseIds: Set<number>;
  onSelectHouses: (ids: Set<number>) => void;
  onToggleHouseSelection: (houseId: number) => void;
}

export function MapView({
  houses,
  statusByHouse,
  canEditHouse,
  onSetStatus,
  isAdmin,
  editMode,
  placingHouseId,
  onPlaceHouse,
  onAddHouseAt,
  selectedHouseIds,
  onSelectHouses,
  onToggleHouseSelection,
}: Props) {
  const [openHouseId, setOpenHouseId] = useState<number | null>(null);

  const placed = useMemo(() => houses.filter((h) => h.lat != null && h.lng != null), [houses]);
  const positions = useMemo<LatLngTuple[]>(() => placed.map((h) => [h.lat as number, h.lng as number]), [placed]);
  const openHouse = houses.find((h) => h.id === openHouseId) ?? null;

  return (
    <div className={`map-wrap map-mode-${editMode}`}>
      <MapContainer center={RENTON_WA} zoom={15} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {isAdmin && (
          <MapClickListener
            active={placingHouseId != null || editMode === "add"}
            onClick={(lat, lng) => (placingHouseId != null ? onPlaceHouse(placingHouseId, lat, lng) : onAddHouseAt(lat, lng))}
          />
        )}
        {isAdmin && <RectSelectTool active={editMode === "select"} houses={placed} onSelect={onSelectHouses} />}
        {placed.map((house) => {
          const status = statusByHouse.get(house.id) ?? "not_started";
          const selected = selectedHouseIds.has(house.id);
          const draggable = isAdmin && editMode === "reposition";
          return (
            <Marker
              key={house.id}
              position={[house.lat as number, house.lng as number]}
              icon={houseIcon(STATUS_COLORS[status], selected)}
              draggable={draggable}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  onPlaceHouse(house.id, lat, lng);
                },
                click: () => {
                  if (editMode === "select") onToggleHouseSelection(house.id);
                  else if (editMode === "view") setOpenHouseId(house.id);
                },
              }}
            />
          );
        })}
      </MapContainer>
      {editMode === "view" && openHouse && (
        <HousePanel
          house={openHouse}
          status={statusByHouse.get(openHouse.id) ?? "not_started"}
          canEdit={canEditHouse(openHouse)}
          onSetStatus={(status) => onSetStatus(openHouse.id, status)}
          onClose={() => setOpenHouseId(null)}
        />
      )}
    </div>
  );
}
