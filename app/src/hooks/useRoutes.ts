import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Route } from "../lib/types";

interface RouteHouseRow {
  route_id: number;
  house_id: number;
}

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeHouses, setRouteHouses] = useState<RouteHouseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [routesRes, routeHousesRes] = await Promise.all([
      supabase.from("routes").select("*").order("number"),
      supabase.from("route_houses").select("route_id, house_id"),
    ]);
    setRoutes(routesRes.data ?? []);
    setRouteHouses(routeHousesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const houseIdsByRoute = new Map<number, Set<number>>();
  const routeIdsByHouse = new Map<number, Set<number>>();
  for (const { route_id, house_id } of routeHouses) {
    if (!houseIdsByRoute.has(route_id)) houseIdsByRoute.set(route_id, new Set());
    houseIdsByRoute.get(route_id)!.add(house_id);
    if (!routeIdsByHouse.has(house_id)) routeIdsByHouse.set(house_id, new Set());
    routeIdsByHouse.get(house_id)!.add(route_id);
  }

  return { routes, houseIdsByRoute, routeIdsByHouse, loading, refresh };
}
