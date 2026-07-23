function hslToHex(h: number, s: number, l: number): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sFrac * Math.min(lFrac, 1 - lFrac);
  const f = (n: number) => lFrac - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Deterministic, distinct-ish fill color per zone, via golden-angle hue rotation. */
export function defaultZoneColorHex(zoneId: number): string {
  const hue = (zoneId * 137.508) % 360;
  return hslToHex(hue, 65, 55);
}

/** The color actually used for a zone's pins: its admin-chosen override, or the hash-based default. */
export function zoneColor(zoneId: number | null, override?: string | null): string {
  if (zoneId == null) return "#9ca3af"; // no zone: neutral gray
  return override || defaultZoneColorHex(zoneId);
}
