// Public interface — deterministic impact metrics from the dispatch audit
// trail. Zero AI. Orchestrates repositories (lib) + pure compute.

export {
  computeEventMetrics,
  computeOverviewMetrics,
  formatDurationMs,
  formatRmRange,
  median,
} from "./compute";
export type {
  EventMetrics,
  OverviewMetrics,
  RmRange,
  MetricDispatchInput,
  MetricCheckoffInput,
} from "./compute";

import {
  getCheckoffsForDispatches,
  getDispatchesForEvents,
  getEventTimeline,
  getFloodEvent,
  listRecentFloodEvents,
  type MetricsEventRow,
} from "@/lib/db/repositories/metrics.repo";
import {
  computeEventMetrics,
  computeOverviewMetrics,
  type EventMetrics,
  type OverviewMetrics,
} from "./compute";

async function buildEventMetrics(events: MetricsEventRow[]): Promise<EventMetrics[]> {
  if (events.length === 0) return [];

  const dispatches = await getDispatchesForEvents(events.map((e) => e.id));
  const checkoffs = await getCheckoffsForDispatches(dispatches.map((d) => d.dispatch_id));

  const dispatchesByEvent = new Map<string, typeof dispatches>();
  for (const d of dispatches) {
    const list = dispatchesByEvent.get(d.flood_event_id) ?? [];
    list.push(d);
    dispatchesByEvent.set(d.flood_event_id, list);
  }
  const checkoffsByDispatch = new Set(dispatches.map((d) => d.dispatch_id));

  const results: EventMetrics[] = [];
  for (const event of events) {
    const eventDispatches = dispatchesByEvent.get(event.id) ?? [];
    const timeline = await getEventTimeline(event.station_id, event.started_at, event.ended_at);
    results.push(
      computeEventMetrics(
        {
          id: event.id,
          stationId: event.station_id,
          tier: event.tier,
          startedAt: event.started_at,
          simulated: event.simulated,
        },
        eventDispatches.map((d) => ({
          dispatchId: d.dispatch_id,
          status: d.status,
          sentAt: d.sent_at,
          shopName: d.shop_name,
          actions: d.actions,
        })),
        checkoffs
          .filter((c) => checkoffsByDispatch.has(c.dispatch_id))
          .filter((c) => eventDispatches.some((d) => d.dispatch_id === c.dispatch_id))
          .map((c) => ({
            dispatchId: c.dispatch_id,
            actionOrder: c.action_order,
            checkedAt: c.checked_at,
          })),
        { firstDangerAt: timeline.first_danger_at, peakAt: timeline.peak_at }
      )
    );
  }
  return results;
}

export async function getEventMetrics(floodEventId: string): Promise<EventMetrics | null> {
  const event = await getFloodEvent(floodEventId);
  if (!event) return null;
  const [metrics] = await buildEventMetrics([event]);
  return metrics ?? null;
}

export async function getOverviewMetrics(
  limit = 20
): Promise<{ overview: OverviewMetrics; recentEvents: EventMetrics[] }> {
  const events = await listRecentFloodEvents(limit);
  const recentEvents = await buildEventMetrics(events);
  return { overview: computeOverviewMetrics(recentEvents), recentEvents };
}
