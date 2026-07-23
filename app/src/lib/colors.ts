/** Deterministic, distinct-ish fill color per zone, via golden-angle hue rotation. */
export function zoneColor(zoneId: number | null): string {
  if (zoneId == null) return "#9ca3af"; // no zone: neutral gray
  const hue = (zoneId * 137.508) % 360;
  return `hsl(${hue.toFixed(0)}, 65%, 55%)`;
}
