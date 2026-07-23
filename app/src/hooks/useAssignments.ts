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

/** Houses a volunteer can edit: directly assigned, or assigned via their zone. */
export function canEditHouse(
  assignments: Assignment[],
  volunteerId: string | undefined,
  houseId: number,
  zoneId: number | null
): boolean {
  if (!volunteerId) return false;
  return assignments.some(
    (a) => a.volunteer_id === volunteerId && (a.house_id === houseId || (zoneId != null && a.zone_id === zoneId))
  );
}
