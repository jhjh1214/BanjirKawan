// Nominatim geocoding — polite by design: custom User-Agent, >=1.1s between
// requests (Nominatim usage policy), in-memory cache per address. Called once
// per onboarding, never on the storm-time path.

import { logger } from "@/lib/logger";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  stateCode: string | null;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "BanjirKawan/0.1 (flood-resilience hackathon; github.com/jhjh1214/BanjirKawan)";
const MIN_INTERVAL_MS = 1100;

/** Nominatim state names → InfoBanjir state codes. */
const STATE_NAME_TO_CODE: Record<string, string> = {
  perlis: "PLS",
  kedah: "KDH",
  "pulau pinang": "PNG",
  penang: "PNG",
  perak: "PRK",
  selangor: "SEL",
  "kuala lumpur": "WLH",
  "wilayah persekutuan kuala lumpur": "WLH",
  putrajaya: "PTJ",
  "negeri sembilan": "NSN",
  melaka: "MLK",
  malacca: "MLK",
  johor: "JHR",
  pahang: "PHG",
  terengganu: "TRG",
  kelantan: "KEL",
  sarawak: "SRK",
  sabah: "SAB",
  labuan: "WLP",
};

const cache = new Map<string, GeocodeResult>();
let lastRequestAt = 0;

/** GPS path: coords → address text + state code. Same politeness rules. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const key = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`nominatim reverse HTTP ${res.status}`);

  const hit = (await res.json()) as {
    display_name?: string;
    address?: { state?: string; city?: string };
  };
  const stateName = (hit.address?.state ?? hit.address?.city ?? "").toLowerCase();
  const result: GeocodeResult = {
    lat,
    lng,
    displayName: hit.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    stateCode: STATE_NAME_TO_CODE[stateName] ?? null,
  };

  logger.info("reverse geocoded", { ...result });
  cache.set(key, result);
  return result;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const key = address.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  // Respect Nominatim's absolute max of 1 request/second.
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "my",
    limit: "1",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`nominatim HTTP ${res.status}`);

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { state?: string; city?: string };
  }>;

  if (results.length === 0) {
    throw new Error(`address not found: "${address}"`);
  }

  const hit = results[0];
  const stateName = (hit.address?.state ?? hit.address?.city ?? "").toLowerCase();
  const result: GeocodeResult = {
    lat: Number.parseFloat(hit.lat),
    lng: Number.parseFloat(hit.lon),
    displayName: hit.display_name,
    stateCode: STATE_NAME_TO_CODE[stateName] ?? null,
  };

  logger.info("geocoded address", { address, ...result });
  cache.set(key, result);
  return result;
}
