import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments, canEditHouse } from "../hooks/useAssignments";
import { useRoutes } from "../hooks/useRoutes";
import { MapView, type MapEditMode } from "../components/MapView";
import { MapToolbar } from "../components/MapToolbar";
import { NewHouseForm } from "../components/NewHouseForm";
import { BulkAssignPanel } from "../components/BulkAssignPanel";
import { StatusLegend } from "../components/StatusLegend";
import { supabase } from "../lib/supabaseClient";
import type { DeliveryStatusValue } from "../lib/types";

export function MapPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile, isAdmin } = useAuth();
  const { zones, houses, removeHouseLocally, upsertHouseLocally } = useZonesAndHouses();
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);
  const { assignments } = useAssignments(campaignId);
  const { routes, houseIdsByRoute, routeIdsByHouse, refresh: refreshRoutes } = useRoutes();

  const [editMode, setEditMode] = useState<MapEditMode>("view");
  const [placingHouseId, setPlacingHouseId] = useState<number | null>(null);
  const [pendingNewHouse, setPendingNewHouse] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingDeleteHouseId, setPendingDeleteHouseId] = useState<number | null>(null);
  const [selectedHouseIds, setSelectedHouseIds] = useState<Set<number>>(new Set());
  const [mapError, setMapError] = useState<string | null>(null);

  const unplaced = houses.filter((h) => h.lat == null || h.lng == null);
  const pendingDeleteHouse = houses.find((h) => h.id === pendingDeleteHouseId) ?? null;

  const handleSetStatus = (houseId: number, status: DeliveryStatusValue) => {
    if (!session) return;
    setStatus(houseId, status, session.user.id);
  };

  const handlePlaceHouse = async (houseId: number, lat: number, lng: number) => {
    const { error, data } = await supabase.from("houses").update({ lat, lng }).eq("id", houseId).select().single();
    if (error) return setMapError(`Couldn't move house: ${error.message}`);
    if (!data) return setMapError("Move didn't take effect - check you're signed in as admin.");
    upsertHouseLocally(data);
    setPlacingHouseId(null);
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
      .single();
    if (error) return setMapError(`Couldn't create house: ${error.message}`);
    if (data) upsertHouseLocally(data);
    setPendingNewHouse(null);
  };

  const handleDeleteHouse = (houseId: number) => {
    setPendingDeleteHouseId(houseId);
  };

  const confirmDeleteHouse = async () => {
    if (pendingDeleteHouseId == null) return;
    const houseId = pendingDeleteHouseId;
    const { error, data } = await supabase.from("houses").delete().eq("id", houseId).select();
    setPendingDeleteHouseId(null);
    if (error) return setMapError(`Couldn't delete house: ${error.message}`);
    if (!data || data.length === 0) return setMapError("Delete didn't affect any rows - check you're signed in as admin.");
    removeHouseLocally(houseId);
  };

  const handleAddToRoute = async (routeId: number) => {
    if (selectedHouseIds.size === 0) return;
    const rows = Array.from(selectedHouseIds).map((houseId) => ({ route_id: routeId, house_id: houseId }));
    const { error } = await supabase.from("route_houses").upsert(rows, { onConflict: "route_id,house_id" });
    if (error) return setMapError(`Couldn't add houses to route: ${error.message}`);
    setSelectedHouseIds(new Set());
    refreshRoutes();
  };

  const handleCreateRoute = async (number: number, name: string) => {
    if (selectedHouseIds.size === 0) return;
    const { error: routeError, data: route } = await supabase
      .from("routes")
      .insert({ number, name: name || null })
      .select()
      .single();
    if (routeError || !route) return setMapError(`Couldn't create route: ${routeError?.message}`);
    const rows = Array.from(selectedHouseIds).map((houseId) => ({ route_id: route.id, house_id: houseId }));
    const { error: linkError } = await supabase.from("route_houses").insert(rows);
    if (linkError) return setMapError(`Route created but couldn't add houses: ${linkError.message}`);
    setSelectedHouseIds(new Set());
    refreshRoutes();
  };

  const handleModeChange = (mode: MapEditMode) => {
    setEditMode(mode);
    setPlacingHouseId(null);
    setPendingNewHouse(null);
    setPendingDeleteHouseId(null);
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
      {mapError && (
        <div className="map-error-banner">
          {mapError}
          <button className="btn" onClick={() => setMapError(null)}>
            &times;
          </button>
        </div>
      )}
      <MapView
        houses={houses}
        statusByHouse={statusByHouse}
        canEditHouse={(house) => isAdmin || canEditHouse(assignments, routeIdsByHouse, profile?.id, house.id)}
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
      {isAdmin && pendingDeleteHouse && (
        <div className="house-panel">
          <button className="house-panel-close" onClick={() => setPendingDeleteHouseId(null)} aria-label="Close">
            &times;
          </button>
          <h3>Delete house?</h3>
          <p>{pendingDeleteHouse.address}</p>
          <p className="hint">This also removes its status/route history. Cannot be undone.</p>
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
      {isAdmin && editMode === "select" && (
        <BulkAssignPanel
          count={selectedHouseIds.size}
          routes={routes}
          onAddToRoute={handleAddToRoute}
          onCreateRoute={handleCreateRoute}
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
        {isAdmin && houseIdsByRoute.size === 0 && houses.length > 0 && (
          <p className="hint">No routes yet. Use "Select &amp; assign" to draw one, or manage them on the Admin page.</p>
        )}
      </div>
    </div>
  );
}
