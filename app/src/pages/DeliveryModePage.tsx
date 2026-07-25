import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments } from "../hooks/useAssignments";
import { useGeolocation } from "../hooks/useGeolocation";
import { directionsUrl, distanceMeters, formatDistance, nearestNeighborOrder, type LatLng } from "../lib/geo";
import { STATUS_LABELS, type DeliveryStatusValue, type House } from "../lib/types";
import { InstallButton } from "../components/InstallButton";
import { DeliveryMap } from "../components/DeliveryMap";
import { NotesEditor } from "../components/NotesEditor";

// Suburban GPS accuracy under tree cover is often 15-30m, so "arrived"
// needs enough slack to trigger while still standing on the right porch.
const ARRIVAL_RADIUS_M = 40;
const PENDING_STATUSES: DeliveryStatusValue[] = ["not_started", "no_answer"];
const ACTION_ORDER: DeliveryStatusValue[] = ["delivered", "no_answer", "skipped"];

type PlacedHouse = House & LatLng;

function hasCoords(h: House): h is PlacedHouse {
  return h.lat != null && h.lng != null;
}

export function DeliveryModePage({ campaignId }: { campaignId: string | null }) {
  const { session, profile } = useAuth();
  const { houses, zones } = useZonesAndHouses();
  const { assignments } = useAssignments(campaignId);
  const { statusByHouse, notesByHouse, setStatus, setNotes } = useDeliveryStatus(campaignId);
  const geo = useGeolocation();
  const [manualTargetId, setManualTargetId] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);
  const [showMap, setShowMap] = useState(false);

  if (!session || !profile) return <p className="hint">Sign in to use delivery mode.</p>;
  if (!campaignId) return <p className="hint">Pick a campaign above first.</p>;

  const myZoneIds = new Set(
    assignments.filter((a) => a.volunteer_id === profile.id && a.zone_id != null).map((a) => a.zone_id)
  );
  const myHouseIds = new Set(
    assignments.filter((a) => a.volunteer_id === profile.id && a.house_id != null).map((a) => a.house_id)
  );
  const myAssignedHouses = houses.filter(
    (h) => myHouseIds.has(h.id) || (h.zone_id != null && myZoneIds.has(h.zone_id))
  );
  const myHouses = myAssignedHouses.filter(hasCoords);
  const unplacedCount = myAssignedHouses.length - myHouses.length;

  const isPending = (h: House) => PENDING_STATUSES.includes(statusByHouse.get(h.id) ?? "not_started");
  const pendingHouses = myHouses.filter(isPending);
  const doneCount = myHouses.length - pendingHouses.length;
  const progressPct = myHouses.length === 0 ? 0 : Math.round((doneCount / myHouses.length) * 100);

  const here = geo.position;

  const orderedPending = useMemo(() => {
    if (pendingHouses.length === 0) return [];
    const start: LatLng = here ?? pendingHouses[0];
    return nearestNeighborOrder(start, pendingHouses);
  }, [here, pendingHouses]);

  const manualTarget = manualTargetId != null ? pendingHouses.find((h) => h.id === manualTargetId) ?? null : null;
  const target = manualTarget ?? orderedPending[0] ?? null;
  const targetDistance = target && here ? distanceMeters(here, target) : null;
  const arrived = targetDistance != null && targetDistance <= ARRIVAL_RADIUS_M;

  const handleSetStatus = (houseId: number, status: DeliveryStatusValue) => {
    setStatus(houseId, status, session.user.id);
    if (manualTargetId === houseId) setManualTargetId(null);
  };

  if (myHouses.length === 0 && unplacedCount === 0) {
    return <p className="hint">No houses assigned to you yet for this campaign.</p>;
  }

  return (
    <div className="delivery-mode">
      <div className="delivery-progress">
        <div className="delivery-progress-bar">
          <div className="delivery-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="delivery-progress-label">
          {doneCount} of {myHouses.length} done
          {unplacedCount > 0 && ` (${unplacedCount} assigned house${unplacedCount === 1 ? "" : "s"} not yet on the map)`}
        </div>
      </div>

      <InstallButton className="delivery-install-hint" />

      {!geo.supported && <p className="delivery-gps-hint">GPS isn't available on this device -- showing address order.</p>}
      {geo.error && <p className="delivery-gps-hint">Location error: {geo.error}. Showing address order instead.</p>}

      {target ? (
        <TargetCard
          key={target.id}
          house={target}
          status={statusByHouse.get(target.id) ?? "not_started"}
          notes={notesByHouse.get(target.id) ?? null}
          distance={targetDistance}
          arrived={arrived}
          isManual={manualTargetId === target.id}
          onSetStatus={(status) => handleSetStatus(target.id, status)}
          onBackToAuto={() => setManualTargetId(null)}
          onSaveNotes={(notes) => setNotes(target.id, notes, session.user.id)}
        />
      ) : (
        <div className="delivery-done">
          <p>All assigned houses are done. 🎉</p>
        </div>
      )}

      <div className="delivery-toggle-row">
        <button className="btn delivery-list-toggle" onClick={() => setShowMap((v) => !v)}>
          {showMap ? "Hide" : "Show"} map
        </button>
        <button className="btn delivery-list-toggle" onClick={() => setShowList((v) => !v)}>
          {showList ? "Hide" : "Show"} remaining houses ({orderedPending.length})
        </button>
      </div>

      {showMap && (
        <DeliveryMap
          houses={myHouses}
          zones={zones}
          statusByHouse={statusByHouse}
          targetId={target?.id ?? null}
          here={here}
          onSelectHouse={(id) => {
            if (pendingHouses.some((h) => h.id === id)) setManualTargetId(id);
          }}
        />
      )}

      {showList && (
        <ul className="delivery-list">
          {orderedPending.map((house) => (
            <li key={house.id} className={house.id === target?.id ? "is-target" : ""}>
              <span>
                {house.address}
                {notesByHouse.get(house.id) && <span title={notesByHouse.get(house.id) ?? undefined}> 📝</span>}
              </span>
              <span className="delivery-list-right">
                {here && <span className="delivery-list-distance">{formatDistance(distanceMeters(here, house))}</span>}
                {house.id !== target?.id && (
                  <button className="btn btn-link" onClick={() => setManualTargetId(house.id)}>
                    Go here
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TargetCard({
  house,
  status,
  notes,
  distance,
  arrived,
  isManual,
  onSetStatus,
  onBackToAuto,
  onSaveNotes,
}: {
  house: PlacedHouse;
  status: DeliveryStatusValue;
  notes: string | null;
  distance: number | null;
  arrived: boolean;
  isManual: boolean;
  onSetStatus: (status: DeliveryStatusValue) => void;
  onBackToAuto: () => void;
  onSaveNotes: (notes: string | null) => void;
}) {
  return (
    <div className={`delivery-target-card${arrived ? " arrived" : ""}`}>
      <p className="delivery-target-address">{house.address}</p>
      <div className="delivery-target-meta">
        {arrived && <span className="delivery-arrived-badge">📍 You're here</span>}
        {!arrived && distance != null && <span>{formatDistance(distance)} away</span>}
        {isManual && (
          <button className="btn btn-link" onClick={onBackToAuto}>
            Back to nearest
          </button>
        )}
      </div>
      <a className="delivery-directions-link" href={directionsUrl(house)} target="_blank" rel="noreferrer">
        Get directions →
      </a>

      <NotesEditor notes={notes} onSaveNotes={onSaveNotes} onSetStatus={onSetStatus} />

      <div className="delivery-actions">
        {ACTION_ORDER.map((s) => (
          <button
            key={s}
            className={`btn status-btn status-btn-${s}`}
            disabled={s === status}
            onClick={() => onSetStatus(s)}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
