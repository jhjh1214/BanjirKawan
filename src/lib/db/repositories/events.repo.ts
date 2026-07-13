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
    const base = i * 5;
    values.push(r.stationId, r.stationName, r.stateCode, r.levelM, r.thresholdState);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  });
  await pool.query(
    `insert into river_readings (station_id, station_name, state_code, level_m, threshold_state)
     values ${tuples.join(", ")}`,
    values
  );
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
