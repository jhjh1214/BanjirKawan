import { getPool } from "@/lib/db/client";

// Raw rows for the metrics module. ALL metrics SQL lives here; the math
// lives in src/modules/metrics/compute.ts (pure, unit-tested).

export interface MetricsEventRow {
  id: string;
  station_id: string;
  tier: string;
  started_at: Date;
  ended_at: Date | null;
  simulated: boolean;
}

export interface MetricsDispatchRow {
  dispatch_id: string;
  flood_event_id: string;
  status: string;
  sent_at: Date | null;
  shop_name: string;
  /** Validated playbook actions (order + savesRM are what metrics need). */
  actions: Array<{ order: number; savesRM: { low: number; high: number }; text?: string }>;
}

export interface MetricsCheckoffRow {
  dispatch_id: string;
  action_order: number;
  checked_at: Date;
}

export interface EventTimelineRow {
  first_danger_at: Date | null;
  peak_at: Date | null;
}

export async function listRecentFloodEvents(limit = 20): Promise<MetricsEventRow[]> {
  const { rows } = await getPool().query<MetricsEventRow>(
    `select id, station_id, tier, started_at, ended_at, simulated
     from flood_events
     order by started_at desc
     limit $1`,
    [limit]
  );
  return rows;
}

export async function getFloodEvent(id: string): Promise<MetricsEventRow | null> {
  const { rows } = await getPool().query<MetricsEventRow>(
    `select id, station_id, tier, started_at, ended_at, simulated
     from flood_events where id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getDispatchesForEvents(eventIds: string[]): Promise<MetricsDispatchRow[]> {
  if (eventIds.length === 0) return [];
  const { rows } = await getPool().query<MetricsDispatchRow>(
    `select d.id as dispatch_id,
            d.flood_event_id,
            d.status,
            d.sent_at,
            s.name as shop_name,
            p.actions
     from dispatches d
     join playbooks p on p.id = d.playbook_id
     join shops s on s.id = p.shop_id
     where d.flood_event_id = any($1::uuid[])`,
    [eventIds]
  );
  return rows;
}

export async function getCheckoffsForDispatches(
  dispatchIds: string[]
): Promise<MetricsCheckoffRow[]> {
  if (dispatchIds.length === 0) return [];
  const { rows } = await getPool().query<MetricsCheckoffRow>(
    `select dispatch_id, action_order, checked_at
     from dispatch_checkoffs
     where dispatch_id = any($1::uuid[])`,
    [dispatchIds]
  );
  return rows;
}

/**
 * Station timeline within the event window: first DANGER-state reading and
 * the peak-level reading. Window extends 12h past the event start (or to
 * ended_at) so lead time can be measured for ongoing events.
 */
export async function getEventTimeline(
  stationId: string,
  startedAt: Date,
  endedAt: Date | null
): Promise<EventTimelineRow> {
  const windowEnd = endedAt ?? new Date(startedAt.getTime() + 12 * 60 * 60 * 1000);
  const { rows } = await getPool().query<EventTimelineRow>(
    `select
       (select min(ts) from river_readings
        where station_id = $1 and ts between $2 and $3 and threshold_state = 'danger') as first_danger_at,
       (select ts from river_readings
        where station_id = $1 and ts between $2 and $3 and level_m is not null
        order by level_m desc, ts asc limit 1) as peak_at`,
    [stationId, startedAt, windowEnd]
  );
  return rows[0] ?? { first_danger_at: null, peak_at: null };
}
