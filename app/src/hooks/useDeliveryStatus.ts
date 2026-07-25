import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { DeliveryStatus, DeliveryStatusValue } from "../lib/types";

interface HouseDeliveryDetail {
  status: DeliveryStatusValue;
  notes: string | null;
}

/**
 * Live map of house_id -> {status, notes} for one campaign. Loads the
 * current rows once, then subscribes to Postgres changes on delivery_status
 * scoped to that campaign so every open tab/device stays in sync (PLAN.md
 * section 5).
 */
export function useDeliveryStatus(campaignId: string | null) {
  const [detailsByHouse, setDetailsByHouse] = useState<Map<number, HouseDeliveryDetail>>(new Map());

  useEffect(() => {
    if (!campaignId) {
      setDetailsByHouse(new Map());
      return;
    }

    let cancelled = false;

    supabase
      .from("delivery_status")
      .select("house_id, status, notes")
      .eq("campaign_id", campaignId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDetailsByHouse(
          new Map(data.map((row) => [row.house_id, { status: row.status as DeliveryStatusValue, notes: row.notes }]))
        );
      });

    const channel = supabase
      .channel(`delivery_status:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_status", filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const row = payload.new as DeliveryStatus | undefined;
          if (!row) return;
          setDetailsByHouse((prev) => {
            const next = new Map(prev);
            next.set(row.house_id, { status: row.status, notes: row.notes });
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

  const statusByHouse = useMemo(
    () => new Map(Array.from(detailsByHouse, ([id, d]) => [id, d.status])),
    [detailsByHouse]
  );
  const notesByHouse = useMemo(
    () => new Map(Array.from(detailsByHouse, ([id, d]) => [id, d.notes])),
    [detailsByHouse]
  );

  const setStatus = async (houseId: number, status: DeliveryStatusValue, userId: string) => {
    // Optimistic local update; the realtime echo will confirm it shortly after.
    setDetailsByHouse((prev) => {
      const next = new Map(prev);
      next.set(houseId, { status, notes: next.get(houseId)?.notes ?? null });
      return next;
    });
    const { error } = await supabase
      .from("delivery_status")
      .upsert(
        { campaign_id: campaignId, house_id: houseId, status, updated_by: userId },
        { onConflict: "campaign_id,house_id" }
      );
    return error;
  };

  const setNotes = async (houseId: number, notes: string | null, userId: string) => {
    setDetailsByHouse((prev) => {
      const next = new Map(prev);
      next.set(houseId, { status: next.get(houseId)?.status ?? "not_started", notes });
      return next;
    });
    const { error } = await supabase
      .from("delivery_status")
      .upsert(
        { campaign_id: campaignId, house_id: houseId, notes, updated_by: userId },
        { onConflict: "campaign_id,house_id" }
      );
    return error;
  };

  return { statusByHouse, notesByHouse, setStatus, setNotes };
}
