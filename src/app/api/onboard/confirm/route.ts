import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  confirmSiteGraph,
  createSiteGraph,
  getLatestSiteGraph,
} from "@/lib/db/repositories/site-graphs.repo";
import { siteGraphSchema } from "@/modules/site-intelligence";
import { generateShopPlaybooks } from "@/modules/playbook";

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

  // Dry-day thinking starts now: kick off playbook generation without holding
  // the response. Self-hosted Node keeps running after the reply; each result
  // is cached independently and logged.
  void generateShopPlaybooks(shopId)
    .then((r) =>
      logger.info("post-confirm playbook generation finished", {
        shopId,
        generated: r.generated.length,
        failed: r.failed.length,
      })
    )
    .catch((err) =>
      logger.error("post-confirm playbook generation crashed", {
        shopId,
        error: err instanceof Error ? err.message : String(err),
      })
    );

  return NextResponse.json({
    ok: true,
    siteGraphId: next.id,
    version: next.version,
    playbooksGenerating: true,
  });
}
