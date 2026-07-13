import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  confirmSiteGraph,
  createSiteGraph,
  getLatestSiteGraph,
} from "@/lib/db/repositories/site-graphs.repo";
import { siteGraphSchema } from "@/modules/site-intelligence";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shopId: z.string().uuid(),
  graph: siteGraphSchema, // the owner-corrected graph from the confirm screen
});

// Onboarding step 2: the owner reviewed/corrected the extracted graph.
// Append-only: the corrected graph becomes the next version, confirmed.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.issues.slice(0, 5) },
      { status: 400 }
    );
  }

  const { shopId, graph } = parsed.data;
  const latest = await getLatestSiteGraph(shopId);
  if (!latest) {
    return NextResponse.json({ error: "no site graph for this shop" }, { status: 404 });
  }

  const next = await createSiteGraph(shopId, graph, latest.photo_urls, latest.enrichment ?? undefined);
  await confirmSiteGraph(next.id);

  logger.info("site graph confirmed", { shopId, version: next.version, assets: graph.assets.length });
  return NextResponse.json({ ok: true, siteGraphId: next.id, version: next.version });
}
