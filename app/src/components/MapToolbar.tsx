import type { MapEditMode } from "./MapView";

const MODES: { id: MapEditMode; label: string; hint: string }[] = [
  { id: "view", label: "View", hint: "Click a house to update its status" },
  { id: "reposition", label: "Move houses", hint: "Drag any pin to fix its location" },
  { id: "add", label: "Add house", hint: "Click the map where a missing house belongs" },
  { id: "select", label: "Select & assign", hint: "Drag a box around houses to assign them as a route" },
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
