import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getOutcome, confirmOutcome } from "@/lib/db/repositories/outcomes.repo";
import {
  confirmSiteGraph,
  createSiteGraph,
  getLatestSiteGraph,
} from "@/lib/db/repositories/site-graphs.repo";
import { computeLossTotals, damageReportSchema } from "@/modules/recovery";
import { updateGraphFromOutcome } from "@/modules/learning";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  outcomeId: z.string().uuid(),
  report: damageReportSchema, // owner-corrected damage report
});

// Recovery step 2: owner sign-off. Persists the corrected report, runs the
// learning loop (site graph v+1, append-only), publishes the report URL.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.issues.slice(0, 5) },
      { status: 400 }
    );
  }

  const { outcomeId, report } = parsed.data;
  const outcome = await getOutcome(outcomeId);
  if (!outcome) return NextResponse.json({ error: "outcome not found" }, { status: 404 });

  const totals = computeLossTotals(report);
  const lossReportUrl = `/report/${outcomeId}`;

  // Learning loop: destroyed/missing assets leave the graph; waterline and
  // damage history become planning inputs for the next playbook generation.
  let graphDiff: unknown = null;
  const latest = await getLatestSiteGraph(outcome.shop_id);
  if (latest) {
    const eventDate = outcome.created_at.toISOString().slice(0, 10);
    const { nextGraph, changesSummary } = updateGraphFromOutcome(latest.graph, report, eventDate);
    if (changesSummary.length > 0) {
      const next = await createSiteGraph(
        outcome.shop_id,
        nextGraph,
        latest.photo_urls,
        latest.enrichment ?? undefined
      );
      await confirmSiteGraph(next.id);
      graphDiff = { fromVersion: latest.version, toVersion: next.version, changes: changesSummary };
      logger.info("learning loop applied", {
        shopId: outcome.shop_id,
        fromVersion: latest.version,
        toVersion: next.version,
        changes: changesSummary.length,
      });
    }
  }

  await confirmOutcome({
    outcomeId,
    damageItems: report,
    reportText: `Flood loss report: ${totals.affectedItems} affected item(s), estimated RM${Math.round(
      totals.low
    )}–${Math.round(totals.high)}.`,
    graphDiff,
    lossReportUrl,
  });

  return NextResponse.json({ ok: true, lossReportUrl, totals, graphDiff });
}
