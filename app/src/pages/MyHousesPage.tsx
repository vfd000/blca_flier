import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useDeliveryStatus } from "../hooks/useDeliveryStatus";
import { useAssignments } from "../hooks/useAssignments";
import { useProfiles } from "../hooks/useProfiles";
import { supabase } from "../lib/supabaseClient";
import { STATUS_LABELS, type DeliveryStatusValue } from "../lib/types";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

export function MyHousesPage({ campaignId }: { campaignId: string | null }) {
  const { session, profile } = useAuth();
  const { zones, houses } = useZonesAndHouses();
  const { assignments, refresh: refreshAssignments } = useAssignments(campaignId);
  const { profiles } = useProfiles();
  const { statusByHouse, setStatus } = useDeliveryStatus(campaignId);

  const [targetType, setTargetType] = useState<"zone" | "house">("zone");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!session || !profile) return <p className="hint">Sign in to see your assigned houses.</p>;
  if (!campaignId) return <p className="hint">Pick a campaign above first.</p>;

  const volunteerLabel = (id: string) => {
    const p = profiles.find((pr) => pr.id === id);
    return p?.display_name ?? p?.email ?? id;
  };
  const zoneAssignee = (zoneId: number) => assignments.find((a) => a.zone_id === zoneId);
  const houseAssignee = (houseId: number) => assignments.find((a) => a.house_id === houseId);

  const myClaims = assignments.filter((a) => a.volunteer_id === profile.id);
  const myZoneIds = new Set(myClaims.filter((a) => a.zone_id != null).map((a) => a.zone_id));
  const myHouseIds = new Set(myClaims.filter((a) => a.house_id != null).map((a) => a.house_id));
  const myHouses = houses.filter((h) => myHouseIds.has(h.id) || (h.zone_id != null && myZoneIds.has(h.zone_id)));

  const handleClaim = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!targetId) return;
    const { error: insertError } = await supabase.from("assignments").insert({
      campaign_id: campaignId,
      zone_id: targetType === "zone" ? Number(targetId) : null,
      house_id: targetType === "house" ? Number(targetId) : null,
      volunteer_id: profile.id,
    });
    if (insertError) setError(insertError.message);
    else {
      setTargetId("");
      refreshAssignments();
    }
  };

  const handleRelease = async (id: number) => {
    await supabase.from("assignments").delete().eq("id", id);
    refreshAssignments();
  };

  return (
    <div className="my-houses-page">
      <h3>Claim a zone or house</h3>
      <p className="hint">
        Pick anything below to cover it yourself this campaign. If it's already assigned to
        someone, claiming it doesn't remove them -- check with them first if that matters.
      </p>
      <form className="admin-form" onSubmit={handleClaim}>
        <select value={targetType} onChange={(e) => setTargetType(e.target.value as "zone" | "house")}>
          <option value="zone">Whole zone</option>
          <option value="house">Single house</option>
        </select>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
          <option value="" disabled>
            {targetType === "zone" ? "Choose a zone..." : "Choose a house..."}
          </option>
          {targetType === "zone"
            ? zones.map((z) => {
                const existing = zoneAssignee(z.id);
                return (
                  <option key={z.id} value={z.id}>
                    Zone {z.number} {z.name ? `(${z.name})` : ""}
                    {existing ? ` -- already assigned to ${volunteerLabel(existing.volunteer_id)}` : ""}
                  </option>
                );
              })
            : houses.map((h) => {
                const existing = houseAssignee(h.id);
                return (
                  <option key={h.id} value={h.id}>
                    {h.address}
                    {existing ? ` -- already assigned to ${volunteerLabel(existing.volunteer_id)}` : ""}
                  </option>
                );
              })}
        </select>
        <button className="btn btn-primary" type="submit">
          Claim
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {myClaims.length > 0 && (
        <ul className="admin-list">
          {myClaims.map((a) => (
            <li key={a.id}>
              {a.zone_id != null
                ? `Zone ${zones.find((z) => z.id === a.zone_id)?.number ?? a.zone_id}`
                : houses.find((h) => h.id === a.house_id)?.address ?? "house"}
              <button className="btn btn-link" onClick={() => handleRelease(a.id)}>
                release
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>My houses ({myHouses.length})</h3>
      {myHouses.length === 0 ? (
        <p className="hint">Nothing claimed yet -- use the picker above.</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
