// Public interface — geocoding (Nominatim, rate-limited, cached) + nearest
// InfoBanjir station resolution. Implementation lands Day 3.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  stateCode: string | null;
}

export async function geocodeAddress(_address: string): Promise<GeocodeResult> {
  throw new Error("geocoding not implemented until Day 3");
}

export interface NearestStationResult {
  stationId: string;
  stationName: string;
  distanceKm: number;
}

export async function resolveNearestStation(
  _lat: number,
  _lng: number
): Promise<NearestStationResult> {
  throw new Error("nearest-station resolution not implemented until Day 3");
}
