// Nearest InfoBanjir station resolution — fully offline.
//
// JPS/DID hydrological station IDs encode their own location on a 0.1° grid:
//   station 3516423 → lat 3.5°N, lon 101.6°E   (digits: LL PP xxx, lon = 100 + PP/10)
// Verified against the real Selangor station list (Klang stations decode to
// ~3.0/101.4, Hulu Selangor to ~3.3–3.6/101.5–101.7). Precision is ~5km —
// enough to pick the right river station for a shop. Non-conforming IDs
// (e.g. state-run "0200101WL") are skipped as candidates.

export interface StationCandidate {
  stationId: string;
  stationName: string;
}

export interface NearestStationResult {
  stationId: string;
  stationName: string;
  distanceKm: number;
  /** Grid-decoded coordinates carry ~5km precision. */
  approx: true;
}

/** Decode a DID station id to approximate coordinates (cell centre), or null. */
export function decodeStationCoords(stationId: string): { lat: number; lng: number } | null {
  const m = stationId.match(/^(\d{2})(\d{2})\d{3}$/);
  if (!m) return null;
  const lat = Number.parseInt(m[1], 10) / 10 + 0.05;
  const lng = 100 + Number.parseInt(m[2], 10) / 10 + 0.05;
  // Peninsular + East Malaysia sanity bounds.
  if (lat < 0.5 || lat > 8 || lng < 99 || lng > 120) return null;
  return { lat, lng };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Pick the nearest decodable station to a point from a candidate list
 * (typically the stations the worker has already seen in river_readings).
 */
export function resolveNearestStation(
  lat: number,
  lng: number,
  candidates: StationCandidate[]
): NearestStationResult | null {
  let best: NearestStationResult | null = null;
  for (const c of candidates) {
    const coords = decodeStationCoords(c.stationId);
    if (!coords) continue;
    const distanceKm = haversineKm({ lat, lng }, coords);
    if (!best || distanceKm < best.distanceKm) {
      best = {
        stationId: c.stationId,
        stationName: c.stationName,
        distanceKm: Math.round(distanceKm * 10) / 10,
        approx: true,
      };
    }
  }
  return best;
}
