import type { MapEditMode } from "./MapView";

const MODES: { id: MapEditMode; label: string; hint: string }[] = [
  { id: "view", label: "View", hint: "Click a house to update its status" },
  { id: "reposition", label: "Move houses", hint: "Drag any pin to fix its location" },
  { id: "add", label: "Add house", hint: "Click the map where a missing house belongs" },
  { id: "bulkAdd", label: "Add multiple", hint: "Click repeatedly to drop several houses in a row - no confirm popup" },
  {
    id: "select",
    label: "Select & zone",
    hint:
      "Drag a box around houses to group them into a zone. Zones are shared across all campaigns -- " +
      "to assign a volunteer for just this campaign, use the House view (click a house) or Admin > Assignments.",
  },
  { id: "delete", label: "Delete house", hint: "Click a house to permanently remove it" },
];

interface Props {
  mode: MapEditMode;
  onChange: (mode: MapEditMode) => void;
}

export function MapToolbar({ mode, onChange }: Props) {
  const active = MODES.find((m) => m.id === mode)!;
  return (
    <div className="map-toolbar">
      <div className="map-toolbar-buttons">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`btn map-toolbar-btn ${mode === m.id ? "active" : ""}`}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode !== "view" && <p className="map-toolbar-hint">{active.hint}</p>}
    </div>
  );
}
