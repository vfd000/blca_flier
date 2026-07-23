import { useState, type FormEvent } from "react";
import type { Route } from "../lib/types";

interface Props {
  count: number;
  routes: Route[];
  onAddToRoute: (routeId: number) => void;
  onCreateRoute: (number: number, name: string) => void;
  onClear: () => void;
}

export function BulkAssignPanel({ count, routes, onAddToRoute, onCreateRoute, onClear }: Props) {
  const [existingRouteId, setExistingRouteId] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");

  if (count === 0) return null;

  const nextSuggestedNumber = routes.length > 0 ? Math.max(...routes.map((r) => r.number)) + 1 : 1;

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const number = newNumber ? Number(newNumber) : nextSuggestedNumber;
    onCreateRoute(number, newName);
    setNewNumber("");
    setNewName("");
  };

  return (
    <div className="house-panel bulk-assign-panel">
      <h3>
        {count} house{count === 1 ? "" : "s"} selected
      </h3>
      <p className="hint">Routes are durable delivery groups - draw them once, reuse them campaign after campaign.</p>

      <div className="admin-form">
        <select value={existingRouteId} onChange={(e) => setExistingRouteId(e.target.value)}>
          <option value="" disabled>
            Add to existing route...
          </option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              Route {r.number} {r.name ? `(${r.name})` : ""}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!existingRouteId}
          onClick={() => onAddToRoute(Number(existingRouteId))}
        >
          Add to route
        </button>
      </div>

      <form className="admin-form" onSubmit={handleCreate}>
        <input
          type="number"
          placeholder={`New route # (suggested: ${nextSuggestedNumber})`}
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
        />
        <input placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn-primary" type="submit">
          Create new route
        </button>
      </form>

      <button className="btn" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}
