import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments, canEditHouse } from "../hooks/useAssignments";
import { MapView } from "../components/MapView";
import { StatusLegend } from "../components/StatusLegend";
import { supabase } from "../lib/supabaseClient";
import type { DeliveryStatusValue } from "../lib/types";

export function MapPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile, isAdmin } = useAuth();
  const { houses, refresh: refreshHouses } = useZonesAndHouses();
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);
  const { assignments } = useAssignments(campaignId);
  const [placingHouseId, setPlacingHouseId] = useState<number | null>(null);

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
        placingHouseId={placingHouseId}
        onPlaceHouse={handlePlaceHouse}
      />
      <div className="map-sidebar">
        <StatusLegend />
        {isAdmin && unplaced.length > 0 && (
          <div className="unplaced-houses">
            <h4>Unplaced houses ({unplaced.length})</h4>
            <p className="hint">Geocoding missed these. Click one, then click its spot on the map.</p>
            <ul>
              {unplaced.map((h) => (
                <li key={h.id}>
                  <button
                    className={`btn btn-link ${placingHouseId === h.id ? "active" : ""}`}
                    onClick={() => setPlacingHouseId(h.id)}
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
