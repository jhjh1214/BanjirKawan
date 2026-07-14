import { getPool } from "@/lib/db/client";
import type { StationReading, ThresholdState } from "@/modules/trigger";

export interface RiverReadingRow {
  id: string;
  station_id: string;
  station_name: string;
  state_code: string;
  level_m: string | null; // numeric comes back as string from pg
  threshold_state: ThresholdState | null;
  raw: Record<string, unknown> | null;
  ts: Date;
}

export interface FloodEventRow {
  id: string;
  station_id: string;
  tier: string;
  started_at: Date;
  ended_at: Date | null;
  simulated: boolean;
}

export async function insertRiverReadings(
  readings: Array<StationReading & { thresholdState: ThresholdState }>
): Promise<void> {
  if (readings.length === 0) return;
  const pool = getPool();
  const values: unknown[] = [];
  const tuples = readings.map((r, i) => {
    const base = i * 6;
    values.push(
      r.stationId,
      r.stationName,
      r.stateCode,
      r.levelM,
      r.thresholdState,
      // Station's published threshold levels ride along — the printable
      // fallback plan and the loss report cite them as official figures.
      JSON.stringify({ thresholds: r.thresholds })
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
  });
  await pool.query(
    `insert into river_readings (station_id, station_name, state_code, level_m, threshold_state, raw)
     values ${tuples.join(", ")}`,
    values
  );
}

/** Latest known station identity + published thresholds (from raw payload). */
export async function getStationInfo(stationId: string): Promise<{
  stationName: string;
  thresholds: { normal: number | null; alert: number | null; warning: number | null; danger: number | null } | null;
} | null> {
  const { rows } = await getPool().query<{ station_name: string; raw: { thresholds?: never } | null }>(
    `select station_name, raw from river_readings
     where station_id = $1 order by ts desc limit 1`,
    [stationId]
  );
  if (!rows[0]) return null;
  const raw = rows[0].raw as { thresholds?: { normal: number | null; alert: number | null; warning: number | null; danger: number | null } } | null;
  return { stationName: rows[0].station_name, thresholds: raw?.thresholds ?? null };
}

export async function getLatestReadings(limit = 20): Promise<RiverReadingRow[]> {
  const { rows } = await getPool().query<RiverReadingRow>(
    `select distinct on (station_id) *
     from river_readings
     order by station_id, ts desc
     limit $1`,
    [limit]
  );
  return rows;
}

/** Latest persisted threshold state per station — used by the worker to detect tier changes. */
export async function getLatestThresholdStates(): Promise<Map<string, ThresholdState | null>> {
  const { rows } = await getPool().query<{ station_id: string; threshold_state: ThresholdState | null }>(
    `select distinct on (station_id) station_id, threshold_state
     from river_readings
     order by station_id, ts desc`
  );
  return new Map(rows.map((r) => [r.station_id, r.threshold_state]));
}

/** Distinct stations the worker has observed — the candidate pool for nearest-station resolution. */
export async function getKnownStations(): Promise<Array<{ station_id: string; station_name: string }>> {
  const { rows } = await getPool().query<{ station_id: string; station_name: string }>(
    `select distinct on (station_id) station_id, station_name
     from river_readings
     order by station_id, ts desc`
  );
  return rows;
}

export async function createFloodEvent(input: {
  stationId: string;
  tier: string;
  simulated?: boolean;
}): Promise<FloodEventRow> {
  const { rows } = await getPool().query<FloodEventRow>(
    `insert into flood_events (station_id, tier, simulated)
     values ($1, $2, coalesce($3, false))
     returning *`,
    [input.stationId, input.tier, input.simulated ?? false]
  );
  return rows[0];
}

/**
 * Highest tier dispatched for a station within the window — the debounce input
 * so an oscillating station doesn't re-alert every poll cycle.
 */
export async function getRecentHighestTierForStation(
  stationId: string,
  withinHours: number
): Promise<"watch" | "warning" | "danger" | null> {
  const { rows } = await getPool().query<{ tier: string }>(
    `select tier from flood_events
     where station_id = $1 and started_at > now() - make_interval(hours => $2)
     and tier in ('watch','warning','danger')
     order by case tier when 'danger' then 3 when 'warning' then 2 when 'watch' then 1 else 0 end desc
     limit 1`,
    [stationId, withinHours]
  );
  const tier = rows[0]?.tier;
  return tier === "watch" || tier === "warning" || tier === "danger" ? tier : null;
}

/** Most recent flood event on a station (to attach a recovery outcome to). */
export async function findRecentEventForStation(
  stationId: string,
  withinDays = 30
): Promise<FloodEventRow | null> {
  const { rows } = await getPool().query<FloodEventRow>(
    `select * from flood_events
     where station_id = $1 and started_at > now() - make_interval(days => $2)
     order by started_at desc limit 1`,
    [stationId, withinDays]
  );
  return rows[0] ?? null;
}

/**
 * Readings for the loss report's evidence table — the station's own published
 * levels during the event window (objective third-party data, JPS telemetry).
 */
export async function getReadingsWindow(
  stationId: string,
  from: Date,
  to: Date,
  maxRows = 24
): Promise<Array<{ level_m: string | null; threshold_state: string | null; ts: Date; station_name: string }>> {
  const { rows } = await getPool().query(
    `select level_m, threshold_state, ts, station_name
     from river_readings
     where station_id = $1 and ts between $2 and $3
     order by ts asc`,
    [stationId, from, to]
  );
  if (rows.length <= maxRows) return rows;
  // Downsample evenly, always keeping first and last.
  const step = (rows.length - 1) / (maxRows - 1);
  return Array.from({ length: maxRows }, (_, i) => rows[Math.round(i * step)]);
}

export async function getStationName(stationId: string): Promise<string | null> {
  const { rows } = await getPool().query<{ station_name: string }>(
    `select station_name from river_readings where station_id = $1 order by ts desc limit 1`,
    [stationId]
  );
  return rows[0]?.station_name ?? null;
}

/** Retention: whole-Malaysia polling writes ~1M rows/month — keep 48h of history. */
export async function deleteReadingsOlderThanHours(hours: number): Promise<number> {
  const result = await getPool().query(
    `delete from river_readings where ts < now() - make_interval(hours => $1)`,
    [hours]
  );
  return result.rowCount ?? 0;
}

export async function listFloodEvents(limit = 20): Promise<FloodEventRow[]> {
  const { rows } = await getPool().query<FloodEventRow>(
    "select * from flood_events order by started_at desc limit $1",
    [limit]
  );
  return rows;
}
