import { NextResponse } from "next/server";
import { queryLatestReadings } from "@/lib/db/repositories/events.repo";
import { decodeStationCoords } from "@/modules/geo";

export const dynamic = "force-dynamic";

// All decodable stations with their grid coordinates + latest threshold, for
// the map view. Coordinates are ~5km precision (DID grid decode) — honest
// about that in the UI. This is a dry-day monitoring view, never the alert path.
export async function GET() {
  const rows = await queryLatestReadings({});
  const stations = rows
    .map((r) => {
      const coords = decodeStationCoords(r.station_id);
      if (!coords) return null;
      return {
        stationId: r.station_id,
        stationName: r.station_name,
        stateCode: r.state_code,
        lat: coords.lat,
        lng: coords.lng,
        levelM: r.level_m,
        thresholdState: r.threshold_state ?? "unknown",
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return NextResponse.json({ stations, total: stations.length });
}
