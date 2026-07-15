import { getSystemStatus } from "@/lib/db/repositories/system.repo";
import { checkFreshness } from "@/modules/trigger";
import { getOverviewMetrics } from "@/modules/metrics";
import { StatusDashboard, type StatusData } from "@/components/status/status-dashboard";

export const dynamic = "force-dynamic";

// Server component: heartbeat + metrics only. The interactive readings table
// (filter/search/paginate) is a client component fetching /api/readings.
export default async function Home() {
  const data: StatusData = {
    workerHealthy: false,
    heartbeatAgeSeconds: null,
    feedFreshness: null,
    statesPolled: [],
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
  } catch (err) {
    data.dbError = err instanceof Error ? err.message : String(err);
  }

  return <StatusDashboard data={data} />;
}
