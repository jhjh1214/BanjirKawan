// Public interface — geocoding (Nominatim, rate-limited, cached) + offline
// nearest-station resolution from grid-encoded DID station ids.

export { geocodeAddress, reverseGeocode } from "./geocode";
export type { GeocodeResult } from "./geocode";
export {
  decodeStationCoords,
  haversineKm,
  resolveNearestStation,
} from "./stations";
export type { StationCandidate, NearestStationResult } from "./stations";
