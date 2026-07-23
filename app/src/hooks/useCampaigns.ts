import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Campaign } from "../lib/types";

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { campaigns, loading, refresh };
}
