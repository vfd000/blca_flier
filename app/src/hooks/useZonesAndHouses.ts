import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { House, Zone } from "../lib/types";

export function useZonesAndHouses() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [zonesRes, housesRes] = await Promise.all([
      supabase.from("zones").select("*").order("number"),
      supabase.from("houses").select("*").order("address"),
    ]);
    setZones(zonesRes.data ?? []);
    setHouses(housesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { zones, houses, loading, refresh };
}
