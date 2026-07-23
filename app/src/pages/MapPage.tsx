import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments, canEditHouse } from "../hooks/useAssignments";
import { MapView, type MapEditMode } from "../components/MapView";
import { MapToolbar } from "../components/MapToolbar";
import { NewHouseForm } from "../components/NewHouseForm";
import { BulkAssignPanel } from "../components/BulkAssignPanel";
import { BulkAddPanel } from "../components/BulkAddPanel";
import { StatusLegend } from "../components/StatusLegend";
import { supabase } from "../lib/supabaseClient";
import { reverseGeocode } from "../lib/geocode";
import type { DeliveryStatusValue, House } from "../lib/types";

interface Notice {
  kind: "error" | "success";
  message: string;
}

export function MapPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile, isAdmin } = useAuth();
  const { zones, houses, removeHouseLocally, upsertHouseLocally } = useZonesAndHouses();
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);
  const { assignments } = useAssignments(campaignId);

  const [editMode, setEditMode] = useState<MapEditMode>("view");
  const [placingHouseId, setPlacingHouseId] = useState<number | null>(null);
  const [pendingNewHouse, setPendingNewHouse] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingDeleteHouseId, setPendingDeleteHouseId] = useState<number | null>(null);
  const [selectedHouseIds, setSelectedHouseIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [bulkAddZoneId, setBulkAddZoneId] = useState("");
  const [bulkAddCount, setBulkAddCount] = useState(0);
  const [lastBulkAddedHouseId, setLastBulkAddedHouseId] = useState<number | null>(null);

  const unplaced = houses.filter((h) => h.lat == null || h.lng == null);
  const pendingDeleteHouse = houses.find((h) => h.id === pendingDeleteHouseId) ?? null;

  const showError = (message: string) => setNotice({ kind: "error", message });
  const showSuccess = (message: string) => setNotice({ kind: "success", message });

  const handleSetStatus = (houseId: number, status: DeliveryStatusValue) => {
    if (!session || !campaignId) return;
    setStatus(houseId, status, session.user.id);
  };

  const handlePlaceHouse = async (houseId: number, lat: number, lng: number) => {
    const { error, data } = await supabase.from("houses").update({ lat, lng }).eq("id", houseId).select().maybeSingle();
    if (error) return showError(`Couldn't move house: ${error.message}`);
    if (!data) return showError("Move didn't take effect (no matching row) - check you're signed in as admin.");
    upsertHouseLocally(data);
    setPlacingHouseId(null);
    showSuccess(`Moved ${data.address}.`);
  };

  const handleAddHouseAt = (lat: number, lng: number) => {
    setPendingNewHouse({ lat, lng });
  };

  const handleCreateHouse = async (address: string, zoneId: number | null) => {
    if (!pendingNewHouse) return;
    const { error, data } = await supabase
      .from("houses")
      .insert({ zone_id: zoneId, address, lat: pendingNewHouse.lat, lng: pendingNewHouse.lng })
      .select()
      .maybeSingle();
    if (error) return showError(`Couldn't create house: ${error.message}`);
    if (!data) return showError("Create didn't return the new house - check you're signed in as admin.");
    upsertHouseLocally(data);
    setPendingNewHouse(null);
    showSuccess(`Added ${data.address}.`);
  };

  const handleBulkAddHouseAt = async (lat: number, lng: number) => {
    const address = (await reverseGeocode(lat, lng)) ?? `Unnamed house near ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const zoneId = bulkAddZoneId ? Number(bulkAddZoneId) : null;
    const { error, data } = await supabase
      .from("houses")
      .insert({ zone_id: zoneId, address, lat, lng })
      .select()
      .maybeSingle();
    if (error) return showError(`Couldn't add house: ${error.message}`);
    if (!data) return showError("Create didn't return the new house - check you're signed in as admin.");
    upsertHouseLocally(data);
    setBulkAddCount((c) => c + 1);
    setLastBulkAddedHouseId(data.id);
    showSuccess(`Added ${data.address}.`);
  };

  const handleUndoLastBulkAdd = async () => {
    if (lastBulkAddedHouseId == null) return;
    const houseId = lastBulkAddedHouseId;
    const houseBeforeDelete = houses.find((h) => h.id === houseId);
    const { error, data } = await supabase.from("houses").delete().eq("id", houseId).select();
    if (error) return showError(`Couldn't undo: ${error.message}`);
    if (!data || data.length === 0) return showError("Undo didn't affect any rows.");
    removeHouseLocally(houseId);
    setBulkAddCount((c) => Math.max(0, c - 1));
    setLastBulkAddedHouseId(null);
    showSuccess(`Removed ${houseBeforeDelete?.address ?? "house"}.`);
  };

  const handleDeleteHouse = (houseId: number) => {
    setPendingDeleteHouseId(houseId);
  };

  const confirmDeleteHouse = async () => {
    if (pendingDeleteHouseId == null) return;
    const houseId = pendingDeleteHouseId;
    const houseBeforeDelete = houses.find((h) => h.id === houseId);
    const { error, data } = await supabase.from("houses").delete().eq("id", houseId).select();
    setPendingDeleteHouseId(null);
    if (error) return showError(`Couldn't delete house: ${error.message}`);
    if (!data || data.length === 0) return showError("Delete didn't affect any rows - check you're signed in as admin.");
    removeHouseLocally(houseId);
    showSuccess(`Deleted ${houseBeforeDelete?.address ?? "house"}.`);
  };

  const handleAddToZone = async (zoneId: number) => {
    if (selectedHouseIds.size === 0) return showError("No houses selected.");
    const ids = Array.from(selectedHouseIds);
    const { error, data } = await supabase.from("houses").update({ zone_id: zoneId }).in("id", ids).select();
    if (error) return showError(`Couldn't add houses to zone: ${error.message}`);
    if (!data || data.length === 0) return showError("Update didn't affect any rows - check you're signed in as admin.");
    data.forEach((h: House) => upsertHouseLocally(h));
    setSelectedHouseIds(new Set());
    showSuccess(`Added ${data.length} house${data.length === 1 ? "" : "s"} to the zone.`);
  };

  const handleCreateZone = async (number: number, name: string) => {
    if (selectedHouseIds.size === 0) return showError("No houses selected.");
    const { error: zoneError, data: zone } = await supabase
      .from("zones")
      .insert({ number, name: name || null })
      .select()
      .maybeSingle();
    if (zoneError || !zone) return showError(`Couldn't create zone: ${zoneError?.message}`);
    const ids = Array.from(selectedHouseIds);
    const { error: updateError, data } = await supabase.from("houses").update({ zone_id: zone.id }).in("id", ids).select();
    if (updateError) return showError(`Zone created but couldn't add houses: ${updateError.message}`);
    (data ?? []).forEach((h: House) => upsertHouseLocally(h));
    setSelectedHouseIds(new Set());
    showSuccess(`Created Zone ${zone.number} with ${data?.length ?? 0} houses.`);
  };

  const handleModeChange = (mode: MapEditMode) => {
    setEditMode(mode);
    setPlacingHouseId(null);
    setPendingNewHouse(null);
    setPendingDeleteHouseId(null);
    setSelectedHouseIds(new Set());
    setBulkAddCount(0);
    setLastBulkAddedHouseId(null);
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
      {notice && (
        <div className={`map-notice-banner map-notice-${notice.kind}`}>
          {notice.message}
          <button className="btn" onClick={() => setNotice(null)}>
            &times;
          </button>
        </div>
      )}
      <MapView
        houses={houses}
        zones={zones}
        statusByHouse={statusByHouse}
        canEditHouse={(house) =>
          campaignId != null && (isAdmin || canEditHouse(assignments, profile?.id, house.id, house.zone_id))
        }
        onSetStatus={handleSetStatus}
        isAdmin={isAdmin}
        editMode={editMode}
        placingHouseId={placingHouseId}
        onPlaceHouse={handlePlaceHouse}
        onAddHouseAt={handleAddHouseAt}
        onBulkAddHouseAt={handleBulkAddHouseAt}
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
      {isAdmin && pendingDeleteHouse && (
        <div className="house-panel">
          <button className="house-panel-close" onClick={() => setPendingDeleteHouseId(null)} aria-label="Close">
            &times;
          </button>
          <h3>Delete house?</h3>
          <p>{pendingDeleteHouse.address}</p>
          <p className="hint">This also removes its status/assignment history. Cannot be undone.</p>
          <div className="house-panel-actions">
            <button className="btn btn-danger" onClick={confirmDeleteHouse}>
              Delete
            </button>
            <button className="btn" onClick={() => setPendingDeleteHouseId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {isAdmin && editMode === "bulkAdd" && (
        <BulkAddPanel
          zones={zones}
          zoneId={bulkAddZoneId}
          onZoneChange={setBulkAddZoneId}
          count={bulkAddCount}
          canUndo={lastBulkAddedHouseId != null}
          onUndoLast={handleUndoLastBulkAdd}
        />
      )}
      {isAdmin && editMode === "select" && (
        <BulkAssignPanel
          count={selectedHouseIds.size}
          zones={zones}
          onAddToZone={handleAddToZone}
          onCreateZone={handleCreateZone}
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
