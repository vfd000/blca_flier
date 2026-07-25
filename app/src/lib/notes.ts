export const NOTE_SEPARATOR = "; ";
export const SUSPECT_EMPTY_NOTE = "Suspected empty";
export const RESIDENT_REFUSED_NOTE = "Resident refused";

function segments(notes: string | null): string[] {
  return (notes ?? "")
    .split(NOTE_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Toggles a canned tag on/off within a free-text notes string, preserving anything else already there. */
export function toggleTag(notes: string | null, tag: string): string | null {
  const segs = segments(notes);
  const idx = segs.findIndex((s) => s.toLowerCase() === tag.toLowerCase());
  const next = idx >= 0 ? segs.filter((_, i) => i !== idx) : [...segs, tag];
  return next.length > 0 ? next.join(NOTE_SEPARATOR) : null;
}

export function hasTag(notes: string | null, tag: string): boolean {
  return segments(notes).some((s) => s.toLowerCase() === tag.toLowerCase());
}
