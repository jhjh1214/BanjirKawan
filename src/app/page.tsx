import { getLatestReadings } from "@/lib/db/repositories/events.repo";
import { getSystemStatus } from "@/lib/db/repositories/system.repo";
import { checkFreshness } from "@/modules/trigger";
import { getOverviewMetrics } from "@/modules/metrics";
import { StatusDashboard, type StatusData } from "@/components/status/status-dashboard";

export const dynamic = "force-dynamic";

// Server component: data only. All presentation (i18n, theme, states) lives
// in the client StatusDashboard.
export default async function Home() {
  const data: StatusData = {
    workerHealthy: false,
    heartbeatAgeSeconds: null,
    feedFreshness: null,
    statesPolled: [],
    readings: [],
    dbError: null,
    metrics: null,
  };

  try {
    const status = await getSystemStatus("worker_heartbeat");
    if (status) {
      const hb = status.value as { freshness?: string; statesPolled?: string[] };
      data.workerHealthy = checkFreshness(status.updated_at) === "fresh";
      data.heartbeatAgeSeconds = Math.round((Date.now() - status.updated_at.getTime()) / 1000);
      data.feedFreshness = hb.freshness ?? null;
      data.statesPolled = hb.statesPolled ?? [];
    }
    data.metrics = (await getOverviewMetrics()).overview;
    data.readings = (await getLatestReadings(15)).map((r) => ({
      stationId: r.station_id,
      stationName: r.station_name,
      stateCode: r.state_code,
      levelM: r.level_m,
      thresholdState: r.threshold_state ?? "unknown",
      ts: r.ts.toISOString(),
    }));
  } catch (err) {
    data.dbError = err instanceof Error ? err.message : String(err);
  }

  return <StatusDashboard data={data} />;
}
