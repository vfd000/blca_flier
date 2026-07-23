import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import { STATUS_COLORS, type DeliveryStatusValue, type House } from "../lib/types";
import { HousePanel } from "./HousePanel";

const RENTON_WA: LatLngTuple = [47.4829, -122.2171];

export type MapEditMode = "view" | "reposition" | "add" | "bulkAdd" | "select" | "delete";

function houseIcon(color: string, selected: boolean, deleteMode: boolean) {
  const ring = selected ? "#2563eb" : deleteMode ? "#b91c1c" : "#1f2937";
  const ringWidth = selected ? 3 : 1.5;
  return L.divIcon({
    className: "house-div-icon",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:${ringWidth}px solid ${ring};"></div>`,
    iconSize: [14, 14],
    // Anchor above center (not [7, 7]) so the dot renders a few pixels below
    // the actual geocoded point instead of sitting directly on top of the
    // house-number label printed on the OSM tile. Purely visual -- the real
    // lat/lng used for box-select etc. is untouched.
    iconAnchor: [7, -8],
  });
}

/**
 * Fit the camera to all houses exactly once, the first time positions become
 * available. Deliberately does NOT refit on every add/delete afterward --
 * that would yank an admin's zoomed-in view back out every time they fix a
 * single pin, which reads as "the map just reset."
 */
function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || positions.length === 0) return;
    map.fitBounds(positions, { padding: [24, 24], maxZoom: 17 });
    didFit.current = true;
  }, [positions, map]);
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
  onBulkAddHouseAt: (lat: number, lng: number) => void;
  selectedHouseIds: Set<number>;
  onSelectHouses: (ids: Set<number>) => void;
  onToggleHouseSelection: (houseId: number) => void;
  onDeleteHouse: (houseId: number) => void;
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
  onBulkAddHouseAt,
  selectedHouseIds,
  onSelectHouses,
  onToggleHouseSelection,
  onDeleteHouse,
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
            active={placingHouseId != null || editMode === "add" || editMode === "bulkAdd"}
            onClick={(lat, lng) => {
              if (placingHouseId != null) onPlaceHouse(placingHouseId, lat, lng);
              else if (editMode === "bulkAdd") onBulkAddHouseAt(lat, lng);
              else onAddHouseAt(lat, lng);
            }}
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
              icon={houseIcon(STATUS_COLORS[status], selected, editMode === "delete")}
              draggable={draggable}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  onPlaceHouse(house.id, lat, lng);
                },
                click: () => {
                  if (editMode === "delete") onDeleteHouse(house.id);
                  else if (editMode === "select") onToggleHouseSelection(house.id);
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
