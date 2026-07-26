import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ActivityLogEntry } from "../lib/types";

const PAGE_SIZE = 50;

/** Paginated, newest-first activity log for one campaign. Admin-only (RLS). */
export function useActivityLog(campaignId: string | null) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = async (offset: number) => {
    if (!campaignId) return;
    setLoading(true);
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("occurred_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    setEntries((prev) => (offset === 0 ? data ?? [] : [...prev, ...(data ?? [])]));
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => {
    setEntries([]);
    setHasMore(true);
    if (campaignId) loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const loadMore = () => loadPage(entries.length);

  return { entries, loading, hasMore, loadMore };
}
