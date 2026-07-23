import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments } from "../hooks/useAssignments";
import { useRoutes } from "../hooks/useRoutes";
import { STATUS_LABELS, type DeliveryStatusValue } from "../lib/types";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

export function MyHousesPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile } = useAuth();
  const { houses } = useZonesAndHouses();
  const { assignments } = useAssignments(campaignId);
  const { houseIdsByRoute } = useRoutes();
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);

  if (!session || !profile) return <p className="hint">Sign in to see your assigned houses.</p>;

  const myRouteIds = new Set(assignments.filter((a) => a.volunteer_id === profile.id).map((a) => a.route_id));
  const myHouseIds = new Set<number>();
  for (const routeId of myRouteIds) {
    for (const houseId of houseIdsByRoute.get(routeId) ?? []) myHouseIds.add(houseId);
  }
  const myHouses = houses.filter((h) => myHouseIds.has(h.id));

  if (!campaignId) return <p className="hint">Pick a campaign above first.</p>;
  if (myHouses.length === 0) return <p className="hint">No houses assigned to you yet for this campaign.</p>;

  return (
    <div className="my-houses-page">
      <h3>My houses ({myHouses.length})</h3>
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
