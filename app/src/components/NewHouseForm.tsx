import { useEffect, useState, type FormEvent } from "react";
import type { Zone } from "../lib/types";

interface Props {
  lat: number;
  lng: number;
  zones: Zone[];
  onCreate: (address: string, zoneId: number | null) => void;
  onCancel: () => void;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  state?: string;
  postcode?: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`
    );
    if (!res.ok) return null;
    const data: { address?: NominatimAddress } = await res.json();
    const a = data.address;
    if (!a?.road) return null;
    return [a.house_number, a.road].filter(Boolean).join(" ");
  } catch {
    return null;
  }
}

export function NewHouseForm({ lat, lng, zones, onCreate, onCancel }: Props) {
  const [address, setAddress] = useState("");
  const [zoneId, setZoneId] = useState<string>("");
  const [looking, setLooking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLooking(true);
    reverseGeocode(lat, lng).then((result) => {
      if (cancelled) return;
      if (result) setAddress(result);
      setLooking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    onCreate(address.trim(), zoneId ? Number(zoneId) : null);
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
          placeholder={looking ? "Looking up address..." : "Address (e.g. 18525 126th Pl SE)"}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoFocus
          required
        />
        {looking && <p className="hint">Looking up address from OpenStreetMap...</p>}
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
          <option value="">No zone (optional)</option>
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
