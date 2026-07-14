import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { getShop } from "@/lib/db/repositories/shops.repo";
import { getLatestSiteGraph } from "@/lib/db/repositories/site-graphs.repo";
import { createOutcome } from "@/lib/db/repositories/outcomes.repo";
import { findRecentEventForStation, getStationName } from "@/lib/db/repositories/events.repo";
import { diffDamage, computeLossTotals } from "@/modules/recovery";
import type { PhotoInput } from "@/modules/site-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const RESIZE_LONG_EDGE = 1536;

// Recovery step 1: after-photos → AI damage assessment against the pre-flood
// site graph. AI use is post-storm (not the alert path); output still passes
// the Zod + sanity validator and then the owner-confirmation screen.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const shopId = String(form.get("shopId") ?? "").trim();
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

  if (!shopId) return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  if (photos.length === 0 || photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `provide 1-${MAX_PHOTOS} after-photos` }, { status: 400 });
  }
  for (const p of photos) {
    if (p.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: `photo ${p.name} exceeds 15MB` }, { status: 400 });
    }
  }

  const shop = await getShop(shopId);
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const siteGraph = await getLatestSiteGraph(shopId);
  if (!siteGraph || !siteGraph.confirmed) {
    return NextResponse.json(
      { error: "this shop has no confirmed pre-flood survey — onboard it first" },
      { status: 409 }
    );
  }

  try {
    const batch = `after-${Date.now()}`;
    const uploadsDir = path.join(getConfig().UPLOADS_DIR, shopId, batch);
    await mkdir(uploadsDir, { recursive: true });

    const photoInputs: PhotoInput[] = [];
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const original = Buffer.from(await photos[i].arrayBuffer());
      const resized = await sharp(original)
        .rotate()
        .resize({ width: RESIZE_LONG_EDGE, height: RESIZE_LONG_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const filename = `photo${i + 1}.jpg`;
      await writeFile(path.join(uploadsDir, filename), resized);
      photoUrls.push(`${shopId}/${batch}/${filename}`);
      photoInputs.push({ mimeType: "image/jpeg", data: resized.toString("base64") });
    }

    // Attach to the station's most recent flood event when there is one.
    const event = shop.nearest_station_id
      ? await findRecentEventForStation(shop.nearest_station_id)
      : null;
    const stationName = shop.nearest_station_id
      ? ((await getStationName(shop.nearest_station_id)) ?? shop.nearest_station_id)
      : "unknown station";
    const eventContext = event
      ? `${event.tier.toUpperCase()} event at ${stationName} starting ${event.started_at.toISOString()}`
      : "recent flooding reported by the owner (no recorded station event)";

    const started = Date.now();
    const result = await diffDamage(siteGraph.graph, photoInputs, eventContext);
    logger.info("damage assessment complete", {
      shopId,
      ms: Date.now() - started,
      items: result.report.items.length,
      lowConfidence: result.lowConfidenceAssetIds.length,
    });

    const outcome = await createOutcome({
      shopId,
      floodEventId: event?.id,
      photoUrls,
      damageItems: result.report,
    });

    return NextResponse.json({
      outcomeId: outcome.id,
      shopName: shop.name,
      report: result.report,
      repairs: result.repairs,
      lowConfidenceAssetIds: result.lowConfidenceAssetIds,
      totals: computeLossTotals(result.report),
      eventId: event?.id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("recovery assessment failed", { shopId, error: message });
    return NextResponse.json(
      { error: `assessment failed: ${message}. Try clearer photos or fewer of them.` },
      { status: 502 }
    );
  }
}
