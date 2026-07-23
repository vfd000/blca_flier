export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance between two points, in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Human-scale distance for a US neighborhood walk: feet close up, miles once it's far. */
export function formatDistance(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 1000) return `${Math.round(feet)} ft`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

/**
 * Greedy nearest-neighbor walking order: starting from `start`, repeatedly
 * pick whichever remaining point is closest to the last one picked. Not the
 * optimal traveling-salesman route, but a good approximation of "walk down
 * the block" and cheap enough to recompute on every GPS update.
 */
export function nearestNeighborOrder<T extends LatLng>(start: LatLng, points: T[]): T[] {
  const remaining = [...points];
  const ordered: T[] = [];
  let from: LatLng = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceMeters(from, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    from = next;
  }
  return ordered;
}

/** Universal "get directions" link -- opens the native Maps app on phones, falls back to the web. */
export function directionsUrl(destination: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=walking`;
}
