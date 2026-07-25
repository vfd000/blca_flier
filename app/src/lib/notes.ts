import { SUSPECT_EMPTY_NOTE } from "./types";

export const NOTE_SEPARATOR = "; ";

/** Toggles a canned "Suspected empty" flag on/off within a free-text notes string, preserving anything else already there. */
export function toggleSuspectEmpty(notes: string | null): string | null {
  const segments = (notes ?? "")
    .split(NOTE_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
  const idx = segments.findIndex((s) => s.toLowerCase() === SUSPECT_EMPTY_NOTE.toLowerCase());
  const next = idx >= 0 ? segments.filter((_, i) => i !== idx) : [...segments, SUSPECT_EMPTY_NOTE];
  return next.length > 0 ? next.join(NOTE_SEPARATOR) : null;
}

export function isSuspectEmpty(notes: string | null): boolean {
  return (notes ?? "")
    .split(NOTE_SEPARATOR)
    .map((s) => s.trim().toLowerCase())
    .includes(SUSPECT_EMPTY_NOTE.toLowerCase());
}
