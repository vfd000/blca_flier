import { useState } from "react";
import { hasTag, toggleTag, RESIDENT_REFUSED_NOTE, SUSPECT_EMPTY_NOTE } from "../lib/notes";
import type { DeliveryStatusValue } from "../lib/types";

interface Props {
  notes: string | null;
  onSaveNotes: (notes: string | null) => void;
  onSetStatus: (status: DeliveryStatusValue) => void;
}

/**
 * Free-text notes editor plus two canned "skip reason" shortcuts. Tapping
 * "Suspect empty" or "Resident refused" both tags the note and sets the
 * house to skipped in one tap -- they're not independent flags, they're
 * ways of saying *why* a house got skipped.
 */
export function NotesEditor({ notes, onSaveNotes, onSetStatus }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");

  const startEditing = () => {
    setDraft(notes ?? "");
    setEditing(true);
  };

  const save = () => {
    const trimmed = draft.trim();
    onSaveNotes(trimmed.length > 0 ? trimmed : null);
    setEditing(false);
  };

  const skipWithReason = (tag: string) => {
    onSaveNotes(toggleTag(notes, tag));
    onSetStatus("skipped");
  };

  if (editing) {
    return (
      <div className="delivery-notes-editor">
        <textarea
          className="delivery-notes-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. big dog, leave at side door..."
          rows={2}
          autoFocus
        />
        <div className="delivery-notes-editor-actions">
          <button className="btn btn-primary" onClick={save}>
            Save note
          </button>
          <button className="btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const suspectEmpty = hasTag(notes, SUSPECT_EMPTY_NOTE);
  const residentRefused = hasTag(notes, RESIDENT_REFUSED_NOTE);

  return (
    <>
      {notes && <p className="delivery-target-notes">📝 {notes}</p>}
      <div className="delivery-notes-actions">
        <button className="btn" onClick={startEditing}>
          📝 {notes ? "Edit note" : "Add note"}
        </button>
        <button
          className={`btn${suspectEmpty ? " active" : ""}`}
          onClick={() => skipWithReason(SUSPECT_EMPTY_NOTE)}
        >
          🏚️ {suspectEmpty ? "Marked suspect empty" : "Suspect empty"}
        </button>
        <button
          className={`btn${residentRefused ? " active" : ""}`}
          onClick={() => skipWithReason(RESIDENT_REFUSED_NOTE)}
        >
          🚫 {residentRefused ? "Marked resident refused" : "Resident refused"}
        </button>
      </div>
    </>
  );
}
