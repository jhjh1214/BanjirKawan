import { getPool } from "@/lib/db/client";

export interface OutcomeRow {
  id: string;
  shop_id: string;
  flood_event_id: string | null;
  report_text: string | null;
  photo_urls: string[];
  damage_items: unknown | null;
  graph_diff: unknown | null;
  loss_report_url: string | null;
  created_at: Date;
}

export async function createOutcome(input: {
  shopId: string;
  floodEventId?: string;
  reportText?: string;
  photoUrls?: string[];
}): Promise<OutcomeRow> {
  const { rows } = await getPool().query<OutcomeRow>(
    `insert into outcomes (shop_id, flood_event_id, report_text, photo_urls)
     values ($1, $2, $3, coalesce($4, '{}'))
     returning *`,
    [input.shopId, input.floodEventId ?? null, input.reportText ?? null, input.photoUrls ?? null]
  );
  return rows[0];
}

export async function listOutcomesForShop(shopId: string): Promise<OutcomeRow[]> {
  const { rows } = await getPool().query<OutcomeRow>(
    "select * from outcomes where shop_id = $1 order by created_at desc",
    [shopId]
  );
  return rows;
}
