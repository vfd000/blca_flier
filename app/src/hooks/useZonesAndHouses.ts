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

  const removeHouseLocally = (houseId: number) => {
    setHouses((prev) => prev.filter((h) => h.id !== houseId));
  };

  const upsertHouseLocally = (house: House) => {
    setHouses((prev) => {
      const idx = prev.findIndex((h) => h.id === house.id);
      if (idx === -1) return [...prev, house];
      const next = [...prev];
      next[idx] = house;
      return next;
    });
  };

  return { zones, houses, loading, refresh, removeHouseLocally, upsertHouseLocally };
}
