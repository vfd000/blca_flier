import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments } from "../hooks/useAssignments";
import { STATUS_LABELS, type DeliveryStatusValue } from "../lib/types";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

export function MyHousesPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile } = useAuth();
  const { houses } = useZonesAndHouses();
  const { assignments } = useAssignments(campaignId);
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);

  if (!session || !profile) return <p className="hint">Sign in to see your assigned houses.</p>;

  const myZoneIds = new Set(assignments.filter((a) => a.volunteer_id === profile.id && a.zone_id != null).map((a) => a.zone_id));
  const myHouseIds = new Set(assignments.filter((a) => a.volunteer_id === profile.id && a.house_id != null).map((a) => a.house_id));
  const myHouses = houses.filter((h) => myHouseIds.has(h.id) || (h.zone_id != null && myZoneIds.has(h.zone_id)));

  if (!campaignId) return <p className="hint">Pick a campaign above first.</p>;
  if (myHouses.length === 0) return <p className="hint">No houses assigned to you yet for this campaign.</p>;

  return (
    <div className="my-houses-page">
      <h3>My houses ({myHouses.length})</h3>
      <Link to="/deliver" className="btn btn-primary my-houses-deliver-link">
        Start delivery mode →
      </Link>
      <ul className="my-houses-list">
        {myHouses.map((house) => {
          const status = statusByHouse.get(house.id) ?? "not_started";
          return (
            <li key={house.id}>
              <span className="my-houses-address">{house.address}</span>
              <span className="my-houses-actions">
                {ORDER.map((s) => (
                  <button
                    key={s}
                    className={`btn status-btn status-btn-${s}`}
                    disabled={s === status}
                    onClick={() => setStatus(house.id, s, session.user.id)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
