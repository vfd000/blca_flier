import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Assignment } from "../lib/types";

export function useAssignments(campaignId: string | null) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!campaignId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("assignments").select("*").eq("campaign_id", campaignId);
    setAssignments(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return { assignments, loading, refresh };
}

/** Houses a volunteer can edit: house belongs to a route assigned to them for this campaign. */
export function canEditHouse(
  assignments: Assignment[],
  routeIdsByHouse: Map<number, Set<number>>,
  volunteerId: string | undefined,
  houseId: number
): boolean {
  if (!volunteerId) return false;
  const myRouteIds = new Set(
    assignments.filter((a) => a.volunteer_id === volunteerId).map((a) => a.route_id)
  );
  const houseRouteIds = routeIdsByHouse.get(houseId);
  if (!houseRouteIds) return false;
  for (const routeId of houseRouteIds) {
    if (myRouteIds.has(routeId)) return true;
  }
  return false;
}
