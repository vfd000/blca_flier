import type { Zone } from "../lib/types";

interface Props {
  zones: Zone[];
  zoneId: string;
  onZoneChange: (zoneId: string) => void;
  count: number;
  canUndo: boolean;
  onUndoLast: () => void;
}

export function BulkAddPanel({ zones, zoneId, onZoneChange, count, canUndo, onUndoLast }: Props) {
  return (
    <div className="house-panel bulk-add-panel">
      <h3>Add multiple houses</h3>
      <p className="hint">Click the map to drop a house at each spot - saved instantly, no confirm needed.</p>
      <div className="admin-form">
        <select value={zoneId} onChange={(e) => onZoneChange(e.target.value)}>
          <option value="">No zone (optional)</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              Zone {z.number} {z.name ? `(${z.name})` : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="bulk-add-count">{count} added this session</p>
      <button className="btn" disabled={!canUndo} onClick={onUndoLast}>
        Undo last
      </button>
    </div>
  );
}
