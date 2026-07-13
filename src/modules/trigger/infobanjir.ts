// ALL InfoBanjir fetching + parsing is isolated in this file.
// If the site's HTML changes, this is the only file that should need edits —
// keep the StationReading interface stable.
//
// NOTE (verified 2026-07-13): the human-facing page at
//   /aras-air/data-paras-air/?state=SEL&lang=en
// is a JS shell with no data. The station table is served by an AJAX endpoint:
//   /aras-air/data-paras-air/aras-air-data/?state={CODE}&district=ALL&station=ALL
// It 403s without a browser User-Agent and 301s once (keep redirect-follow on).

import * as cheerio from "cheerio";

export interface StationReading {
  stationId: string;
  stationName: string;
  district: string;
  mainBasin: string;
  subBasin: string;
  stateCode: string;
  /** Current water level in metres; null when the station reports no value. */
  levelM: number | null;
  /** Station's own published thresholds (metres); null when unpublished. */
  thresholds: {
    normal: number | null;
    alert: number | null;
    warning: number | null;
    danger: number | null;
  };
  /** Station-reported last update, as reported (DD/MM/YYYY HH:mm, MYT). */
  lastUpdateRaw: string;
  /** Parsed last update; null when the raw string is unparseable. */
  lastUpdate: Date | null;
}

const BASE_URL = "https://publicinfobanjir.water.gov.my";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Malaysia is UTC+8 year-round. */
const MYT_OFFSET = "+08:00";

export function buildStateUrl(stateCode: string): string {
  return `${BASE_URL}/aras-air/data-paras-air/aras-air-data/?state=${encodeURIComponent(
    stateCode
  )}&district=ALL&station=ALL`;
}

export async function fetchStationReadings(stateCode: string): Promise<StationReading[]> {
  const res = await fetch(buildStateUrl(stateCode), {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`InfoBanjir fetch failed for state=${stateCode}: HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseStationReadings(html, stateCode);
}

/**
 * Pure parser, exported separately so tests can run it against a saved fixture
 * and the demo never depends on live availability.
 */
export function parseStationReadings(html: string, stateCode: string): StationReading[] {
  const $ = cheerio.load(html);
  const readings: StationReading[] = [];

  $("tr.item").each((_, tr) => {
    const cell = (name: string) => $(tr).find(`td[data-th='${name}']`).first();
    const text = (name: string) => cell(name).text().trim();

    const stationId = text("Station ID");
    const stationName = text("Station Name");
    if (!stationId || !stationName) return;

    const lastUpdateRaw = text("Last Update");

    readings.push({
      stationId,
      stationName,
      district: text("District"),
      mainBasin: text("Main Basin (mm)"),
      subBasin: text("Sub River Basin (mm)"),
      stateCode,
      levelM: parseLevel(cell("wl").text()),
      thresholds: {
        normal: parseLevel(text("Normal")),
        alert: parseLevel(text("Alert")),
        warning: parseLevel(text("Warning")),
        danger: parseLevel(text("Danger")),
      },
      lastUpdateRaw,
      lastUpdate: parseMytTimestamp(lastUpdateRaw),
    });
  });

  return readings;
}

function parseLevel(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return null;
  // InfoBanjir uses large negative sentinels (e.g. -9999) for "no data".
  if (value <= -999) return null;
  return value;
}

function parseMytTimestamp(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh.padStart(2, "0")}:${min}:00${MYT_OFFSET}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
