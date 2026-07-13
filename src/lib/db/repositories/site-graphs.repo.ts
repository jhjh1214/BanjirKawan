import { getPool } from "@/lib/db/client";
import type { SiteGraph } from "@/modules/site-intelligence";

export interface SiteGraphRow {
  id: string;
  shop_id: string;
  version: number;
  graph: SiteGraph;
  photo_urls: string[];
  enrichment: Record<string, unknown> | null;
  confirmed: boolean;
  created_at: Date;
}

/** Append-only: inserts the next version for the shop. */
export async function createSiteGraph(
  shopId: string,
  graph: SiteGraph,
  photoUrls: string[],
  enrichment?: Record<string, unknown>
): Promise<SiteGraphRow> {
  const { rows } = await getPool().query<SiteGraphRow>(
    `insert into site_graphs (shop_id, version, graph, photo_urls, enrichment)
     values (
       $1,
       coalesce((select max(version) from site_graphs where shop_id = $1), 0) + 1,
       $2, $3, $4
     )
     returning *`,
    [shopId, JSON.stringify(graph), photoUrls, enrichment ? JSON.stringify(enrichment) : null]
  );
  return rows[0];
}

export async function getLatestSiteGraph(shopId: string): Promise<SiteGraphRow | null> {
  const { rows } = await getPool().query<SiteGraphRow>(
    `select * from site_graphs where shop_id = $1 order by version desc limit 1`,
    [shopId]
  );
  return rows[0] ?? null;
}

export async function confirmSiteGraph(id: string): Promise<void> {
  await getPool().query("update site_graphs set confirmed = true where id = $1", [id]);
}
