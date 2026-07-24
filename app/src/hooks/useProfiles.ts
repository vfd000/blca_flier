import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/types";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .order("display_name")
      .then(({ data }) => setProfiles(data ?? []));
  }, []);

  return { profiles };
}
