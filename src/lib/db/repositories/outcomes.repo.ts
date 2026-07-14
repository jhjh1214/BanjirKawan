import { getPool } from "@/lib/db/client";
import type { DamageReport } from "@/modules/recovery";

export interface OutcomeRow {
  id: string;
  shop_id: string;
  flood_event_id: string | null;
  report_text: string | null;
  photo_urls: string[];
  damage_items: DamageReport | null;
  graph_diff: unknown | null;
  loss_report_url: string | null;
  created_at: Date;
  confirmed_at: Date | null;
}

export async function createOutcome(input: {
  shopId: string;
  floodEventId?: string;
  photoUrls: string[];
  damageItems: DamageReport;
}): Promise<OutcomeRow> {
  const { rows } = await getPool().query<OutcomeRow>(
    `insert into outcomes (shop_id, flood_event_id, photo_urls, damage_items)
     values ($1, $2, $3, $4)
     returning *`,
    [input.shopId, input.floodEventId ?? null, input.photoUrls, JSON.stringify(input.damageItems)]
  );
  return rows[0];
}

/** Owner sign-off: final items, learning-loop diff, report URL, timestamp. */
export async function confirmOutcome(input: {
  outcomeId: string;
  damageItems: DamageReport;
  reportText: string;
  graphDiff: unknown;
  lossReportUrl: string;
}): Promise<void> {
  await getPool().query(
    `update outcomes
     set damage_items = $2, report_text = $3, graph_diff = $4,
         loss_report_url = $5, confirmed_at = now()
     where id = $1`,
    [
      input.outcomeId,
      JSON.stringify(input.damageItems),
      input.reportText,
      JSON.stringify(input.graphDiff),
      input.lossReportUrl,
    ]
  );
}

export async function getOutcome(id: string): Promise<OutcomeRow | null> {
  const { rows } = await getPool().query<OutcomeRow>("select * from outcomes where id = $1", [id]);
  return rows[0] ?? null;
}

export interface OutcomeReportContext {
  outcome: OutcomeRow;
  shop: {
    id: string;
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
    nearest_station_id: string | null;
  };
  event: { id: string; station_id: string; tier: string; started_at: Date; ended_at: Date | null } | null;
}

/** Everything the printable report needs, resolved server-side. */
export async function getOutcomeReportContext(id: string): Promise<OutcomeReportContext | null> {
  const outcome = await getOutcome(id);
  if (!outcome) return null;

  const { rows: shops } = await getPool().query(
    `select id, name, address, lat, lng, nearest_station_id from shops where id = $1`,
    [outcome.shop_id]
  );
  if (!shops[0]) return null;

  let event: OutcomeReportContext["event"] = null;
  if (outcome.flood_event_id) {
    const { rows } = await getPool().query(
      `select id, station_id, tier, started_at, ended_at from flood_events where id = $1`,
      [outcome.flood_event_id]
    );
    event = rows[0] ?? null;
  }

  return { outcome, shop: shops[0], event };
}

/** Recovery metric inputs. */
export async function listConfirmedOutcomes(
  limit = 20
): Promise<Array<{ created_at: Date; confirmed_at: Date }>> {
  const { rows } = await getPool().query<{ created_at: Date; confirmed_at: Date }>(
    `select created_at, confirmed_at from outcomes
     where confirmed_at is not null
     order by confirmed_at desc limit $1`,
    [limit]
  );
  return rows;
}
