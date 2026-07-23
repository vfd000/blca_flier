import { useState, type FormEvent } from "react";
import type { Zone } from "../lib/types";

interface Props {
  lat: number;
  lng: number;
  zones: Zone[];
  onCreate: (address: string, zoneId: number) => void;
  onCancel: () => void;
}

export function NewHouseForm({ lat, lng, zones, onCreate, onCancel }: Props) {
  const [address, setAddress] = useState("");
  const [zoneId, setZoneId] = useState<string>("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !zoneId) return;
    onCreate(address.trim(), Number(zoneId));
  };

  return (
    <div className="house-panel new-house-form">
      <button className="house-panel-close" onClick={onCancel} aria-label="Close">
        &times;
      </button>
      <h3>Add house</h3>
      <p className="hint">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </p>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Address (e.g. 18525 126th Pl SE)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoFocus
          required
        />
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
          <option value="" disabled>
            Choose a zone...
          </option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              Zone {z.number} {z.name ? `(${z.name})` : ""}
            </option>
          ))}
        </select>
        <div className="house-panel-actions">
          <button className="btn btn-primary" type="submit">
            Create
          </button>
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
