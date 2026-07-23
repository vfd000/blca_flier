import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { DeliveryStatus, DeliveryStatusValue } from "../lib/types";

/**
 * Live map of house_id -> status for one campaign. Loads the current rows
 * once, then subscribes to Postgres changes on delivery_status scoped to
 * that campaign so every open tab/device stays in sync (PLAN.md section 5).
 */
export function useDeliveryStatus(campaignId: string | null) {
  const [statusByHouse, setStatusByHouse] = useState<Map<number, DeliveryStatusValue>>(new Map());

  useEffect(() => {
    if (!campaignId) {
      setStatusByHouse(new Map());
      return;
    }

    let cancelled = false;

    supabase
      .from("delivery_status")
      .select("house_id, status")
      .eq("campaign_id", campaignId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setStatusByHouse(new Map(data.map((row) => [row.house_id, row.status as DeliveryStatusValue])));
      });

    const channel = supabase
      .channel(`delivery_status:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_status", filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const row = payload.new as DeliveryStatus | undefined;
          if (!row) return;
          setStatusByHouse((prev) => {
            const next = new Map(prev);
            next.set(row.house_id, row.status);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const setStatus = async (houseId: number, status: DeliveryStatusValue, userId: string) => {
    // Optimistic local update; the realtime echo will confirm it shortly after.
    setStatusByHouse((prev) => new Map(prev).set(houseId, status));
    const { error } = await supabase
      .from("delivery_status")
      .upsert(
        { campaign_id: campaignId, house_id: houseId, status, updated_by: userId },
        { onConflict: "campaign_id,house_id" }
      );
    return error;
  };

  return { statusByHouse, setStatus };
}
