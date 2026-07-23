import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/types";

interface Props {
  count: number;
  onAssign: (volunteerId: string) => void;
  onClear: () => void;
}

export function BulkAssignPanel({ count, onAssign, onClear }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [volunteerId, setVolunteerId] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .order("display_name")
      .then(({ data }) => setProfiles(data ?? []));
  }, []);

  if (count === 0) return null;

  return (
    <div className="house-panel bulk-assign-panel">
      <h3>{count} house{count === 1 ? "" : "s"} selected</h3>
      <div className="admin-form">
        <select value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)}>
          <option value="" disabled>
            Choose a volunteer...
          </option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name ?? p.email}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={!volunteerId} onClick={() => onAssign(volunteerId)}>
          Assign as route
        </button>
        <button className="btn" onClick={onClear}>
          Clear selection
        </button>
      </div>
    </div>
  );
}
