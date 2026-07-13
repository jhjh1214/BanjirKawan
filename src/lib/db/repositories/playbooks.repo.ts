import { getPool } from "@/lib/db/client";
import type { Playbook, PlaybookTier } from "@/modules/playbook";

export interface PlaybookRow {
  id: string;
  shop_id: string;
  site_graph_version: number;
  tier: PlaybookTier;
  language: string;
  actions: Playbook["actions"];
  validated: boolean;
  created_at: Date;
}

/** Append-only cache: a new row per (re)generation; readers take the latest validated one. */
export async function createPlaybook(input: {
  shopId: string;
  siteGraphVersion: number;
  tier: PlaybookTier;
  language: string;
  actions: Playbook["actions"];
  validated: boolean;
}): Promise<PlaybookRow> {
  const { rows } = await getPool().query<PlaybookRow>(
    `insert into playbooks (shop_id, site_graph_version, tier, language, actions, validated)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [
      input.shopId,
      input.siteGraphVersion,
      input.tier,
      input.language,
      JSON.stringify(input.actions),
      input.validated,
    ]
  );
  return rows[0];
}

/** The storm-time lookup: latest validated cached playbook for a shop + tier. */
export async function getLatestValidatedPlaybook(
  shopId: string,
  tier: PlaybookTier
): Promise<PlaybookRow | null> {
  const { rows } = await getPool().query<PlaybookRow>(
    `select * from playbooks
     where shop_id = $1 and tier = $2 and validated = true
     order by created_at desc
     limit 1`,
    [shopId, tier]
  );
  return rows[0] ?? null;
}
