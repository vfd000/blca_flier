import { useState, type FormEvent } from "react";
import type { Zone } from "../lib/types";

interface Props {
  count: number;
  zones: Zone[];
  onAddToZone: (zoneId: number) => void;
  onCreateZone: (number: number, name: string) => void;
  onClear: () => void;
}

export function BulkAssignPanel({ count, zones, onAddToZone, onCreateZone, onClear }: Props) {
  const [existingZoneId, setExistingZoneId] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");

  if (count === 0) return null;

  const nextSuggestedNumber = zones.length > 0 ? Math.max(...zones.map((z) => z.number)) + 1 : 1;

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const number = newNumber ? Number(newNumber) : nextSuggestedNumber;
    onCreateZone(number, newName);
    setNewNumber("");
    setNewName("");
  };

  return (
    <div className="house-panel bulk-assign-panel">
      <h3>
        {count} house{count === 1 ? "" : "s"} selected
      </h3>
      <p className="hint">Sets each selected house's zone - reassign them to an existing zone or start a new one.</p>

      <div className="admin-form">
        <select value={existingZoneId} onChange={(e) => setExistingZoneId(e.target.value)}>
          <option value="" disabled>
            Add to existing zone...
          </option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              Zone {z.number} {z.name ? `(${z.name})` : ""}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!existingZoneId}
          onClick={() => onAddToZone(Number(existingZoneId))}
        >
          Add to zone
        </button>
      </div>

      <form className="admin-form" onSubmit={handleCreate}>
        <input
          type="number"
          data-1p-ignore="true"
          data-lpignore="true"
          autoComplete="off"
          placeholder={`New zone # (suggested: ${nextSuggestedNumber})`}
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
        />
        <input
          data-1p-ignore="true"
          data-lpignore="true"
          autoComplete="off"
          placeholder="Name (optional)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Create new zone
        </button>
      </form>

      <button className="btn" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}
