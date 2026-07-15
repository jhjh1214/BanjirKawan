import { NextRequest, NextResponse } from "next/server";
import { getDistinctStates, queryLatestReadings } from "@/lib/db/repositories/events.repo";
import { decodeStationCoords, geocodeAddress, haversineKm } from "@/modules/geo";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// GET /api/readings — latest reading per station with filters, optional
// location-based nearest sort, and pagination.
//   q          free text (station name / id)
//   state      state code filter (e.g. SEL)
//   threshold  normal|alert|warning|danger|unknown
//   lat,lng    sort by distance to this point (GPS)
//   place      postcode/address → geocoded server-side, then distance sort
//   sort       recent (default) | level | distance (auto when a centre is set)
//   page, pageSize
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(p.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(p.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );

  // Resolve an optional centre point (GPS wins; else geocode the place text).
  let center: { lat: number; lng: number; label: string } | null = null;
  const lat = Number.parseFloat(p.get("lat") ?? "");
  const lng = Number.parseFloat(p.get("lng") ?? "");
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    center = { lat, lng, label: "GPS" };
  } else {
    const place = p.get("place")?.trim();
    if (place) {
      try {
        const geo = await geocodeAddress(place);
        center = { lat: geo.lat, lng: geo.lng, label: geo.displayName };
      } catch {
        return NextResponse.json(
          { error: "location_not_found", place },
          { status: 200 } // soft: UI shows "couldn't find that place"
        );
      }
    }
  }

  const [all, states] = await Promise.all([
    queryLatestReadings({
      state: p.get("state") ?? undefined,
      threshold: p.get("threshold") ?? undefined,
      q: p.get("q") ?? undefined,
    }),
    getDistinctStates(),
  ]);

  // Attach distance when a centre is set (grid-decoded station coords).
  const withDistance = all.map((r) => {
    let distanceKm: number | null = null;
    if (center) {
      const coords = decodeStationCoords(r.station_id);
      if (coords) distanceKm = Math.round(haversineKm(center, coords) * 10) / 10;
    }
    return {
      stationId: r.station_id,
      stationName: r.station_name,
      stateCode: r.state_code,
      levelM: r.level_m,
      thresholdState: r.threshold_state ?? "unknown",
      ts: r.ts.toISOString(),
      distanceKm,
    };
  });

  // Sort: distance when a centre is set (undecodable stations last), else the
  // requested sort, else most recent.
  const sort = p.get("sort") ?? (center ? "distance" : "recent");
  withDistance.sort((a, b) => {
    if (center && sort === "distance") {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    }
    if (sort === "level") {
      return (Number(b.levelM) || -Infinity) - (Number(a.levelM) || -Infinity);
    }
    return b.ts.localeCompare(a.ts);
  });

  const total = withDistance.length;
  const start = (page - 1) * pageSize;
  const pageRows = withDistance.slice(start, start + pageSize);

  return NextResponse.json({
    readings: pageRows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    states,
    center: center ? { lat: center.lat, lng: center.lng, label: center.label } : null,
    sort,
  });
}
