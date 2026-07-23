import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments, canEditHouse } from "../hooks/useAssignments";
import { MapView, type MapEditMode } from "../components/MapView";
import { MapToolbar } from "../components/MapToolbar";
import { NewHouseForm } from "../components/NewHouseForm";
import { BulkAssignPanel } from "../components/BulkAssignPanel";
import { StatusLegend } from "../components/StatusLegend";
import { supabase } from "../lib/supabaseClient";
import type { DeliveryStatusValue } from "../lib/types";

export function MapPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile, isAdmin } = useAuth();
  const { zones, houses, refresh: refreshHouses } = useZonesAndHouses();
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);
  const { assignments, refresh: refreshAssignments } = useAssignments(campaignId);

  const [editMode, setEditMode] = useState<MapEditMode>("view");
  const [placingHouseId, setPlacingHouseId] = useState<number | null>(null);
  const [pendingNewHouse, setPendingNewHouse] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedHouseIds, setSelectedHouseIds] = useState<Set<number>>(new Set());

  const unplaced = houses.filter((h) => h.lat == null || h.lng == null);

  const handleSetStatus = (houseId: number, status: DeliveryStatusValue) => {
    if (!session) return;
    setStatus(houseId, status, session.user.id);
  };

  const handlePlaceHouse = async (houseId: number, lat: number, lng: number) => {
    await supabase.from("houses").update({ lat, lng }).eq("id", houseId);
    setPlacingHouseId(null);
    refreshHouses();
  };

  const handleAddHouseAt = (lat: number, lng: number) => {
    setPendingNewHouse({ lat, lng });
  };

  const handleCreateHouse = async (address: string, zoneId: number) => {
    if (!pendingNewHouse) return;
    await supabase.from("houses").insert({
      zone_id: zoneId,
      address,
      lat: pendingNewHouse.lat,
      lng: pendingNewHouse.lng,
    });
    setPendingNewHouse(null);
    refreshHouses();
  };

  const handleDeleteHouse = async (houseId: number) => {
    const house = houses.find((h) => h.id === houseId);
    if (!house) return;
    if (!window.confirm(`Delete "${house.address}"? This also removes its status/assignment history.`)) return;
    await supabase.from("houses").delete().eq("id", houseId);
    refreshHouses();
  };

  const handleBulkAssign = async (volunteerId: string) => {
    if (!campaignId || selectedHouseIds.size === 0) return;
    const rows = Array.from(selectedHouseIds).map((houseId) => ({
      campaign_id: campaignId,
      house_id: houseId,
      volunteer_id: volunteerId,
    }));
    await supabase.from("assignments").insert(rows);
    setSelectedHouseIds(new Set());
    refreshAssignments();
  };

  const handleModeChange = (mode: MapEditMode) => {
    setEditMode(mode);
    setPlacingHouseId(null);
    setPendingNewHouse(null);
    setSelectedHouseIds(new Set());
  };

  const handleToggleHouseSelection = (houseId: number) => {
    setSelectedHouseIds((prev) => {
      const next = new Set(prev);
      if (next.has(houseId)) next.delete(houseId);
      else next.add(houseId);
      return next;
    });
  };

  return (
    <div className="map-page">
      <MapView
        houses={houses}
        statusByHouse={statusByHouse}
        canEditHouse={(house) =>
          isAdmin || canEditHouse(assignments, profile?.id, house.id, house.zone_id)
        }
        onSetStatus={handleSetStatus}
        isAdmin={isAdmin}
        editMode={editMode}
        placingHouseId={placingHouseId}
        onPlaceHouse={handlePlaceHouse}
        onAddHouseAt={handleAddHouseAt}
        selectedHouseIds={selectedHouseIds}
        onSelectHouses={setSelectedHouseIds}
        onToggleHouseSelection={handleToggleHouseSelection}
        onDeleteHouse={handleDeleteHouse}
      />
      {isAdmin && pendingNewHouse && (
        <NewHouseForm
          lat={pendingNewHouse.lat}
          lng={pendingNewHouse.lng}
          zones={zones}
          onCreate={handleCreateHouse}
          onCancel={() => setPendingNewHouse(null)}
        />
      )}
      {isAdmin && editMode === "select" && (
        <BulkAssignPanel
          count={selectedHouseIds.size}
          onAssign={handleBulkAssign}
          onClear={() => setSelectedHouseIds(new Set())}
        />
      )}
      <div className="map-sidebar">
        {isAdmin && <MapToolbar mode={editMode} onChange={handleModeChange} />}
        <StatusLegend />
        {isAdmin && unplaced.length > 0 && (
          <div className="unplaced-houses">
            <h4>Unplaced houses ({unplaced.length})</h4>
            <p className="hint">Click one, then click its spot on the map.</p>
            <ul>
              {unplaced.map((h) => (
                <li key={h.id}>
                  <button
                    className={`btn btn-link ${placingHouseId === h.id ? "active" : ""}`}
                    onClick={() => {
                      setEditMode("reposition");
                      setPlacingHouseId(h.id);
                    }}
                  >
                    {h.address}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
