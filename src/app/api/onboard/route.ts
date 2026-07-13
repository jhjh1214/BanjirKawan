import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { createShop, updateShopLocation } from "@/lib/db/repositories/shops.repo";
import { createSiteGraph } from "@/lib/db/repositories/site-graphs.repo";
import { getKnownStations } from "@/lib/db/repositories/events.repo";
import { extractSiteGraphFromPhotos, type PhotoInput } from "@/modules/site-intelligence";
import {
  geocodeAddress,
  resolveNearestStation,
  reverseGeocode,
  type GeocodeResult,
  type NearestStationResult,
} from "@/modules/geo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
/** Long-edge resize keeps request size and token cost sane without losing survey detail. */
const RESIZE_LONG_EDGE = 1536;

// Onboarding step 1: shop details + ~5 photos → AI site survey → unconfirmed
// site graph v1. The owner-confirmation screen (step 2) is the hallucination
// defence — nothing is confirmed here.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

  // GPS path: the browser supplied device coordinates — more accurate than
  // forward-geocoding a typed address, and works for unnamed lorong stalls.
  const gpsLat = Number.parseFloat(String(form.get("lat") ?? ""));
  const gpsLng = Number.parseFloat(String(form.get("lng") ?? ""));
  const hasGps =
    Number.isFinite(gpsLat) &&
    Number.isFinite(gpsLng) &&
    gpsLat >= 0.5 &&
    gpsLat <= 8 &&
    gpsLng >= 99 &&
    gpsLng <= 120;

  if (!name || (!address && !hasGps)) {
    return NextResponse.json(
      { error: "name is required, plus either an address or GPS coordinates" },
      { status: 400 }
    );
  }
  if (photos.length === 0 || photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `provide 1-${MAX_PHOTOS} photos` }, { status: 400 });
  }
  for (const p of photos) {
    if (p.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: `photo ${p.name} exceeds 15MB` }, { status: 400 });
    }
  }

  try {
    const shop = await createShop({
      name,
      // GPS-only onboarding: placeholder now, backfilled with the
      // reverse-geocoded address during enrichment below.
      address: address || `GPS ${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`,
    });

    const uploadsDir = path.join(getConfig().UPLOADS_DIR, shop.id);
    await mkdir(uploadsDir, { recursive: true });

    const photoInputs: PhotoInput[] = [];
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const original = Buffer.from(await photos[i].arrayBuffer());
      const resized = await sharp(original)
        .rotate() // respect EXIF orientation from phone cameras
        .resize({ width: RESIZE_LONG_EDGE, height: RESIZE_LONG_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const filename = `photo${i + 1}.jpg`;
      await writeFile(path.join(uploadsDir, filename), resized);
      photoUrls.push(`${shop.id}/${filename}`);
      photoInputs.push({ mimeType: "image/jpeg", data: resized.toString("base64") });
    }

    const started = Date.now();
    const result = await extractSiteGraphFromPhotos(photoInputs, address || shop.address);
    logger.info("onboarding extraction complete", {
      shopId: shop.id,
      ms: Date.now() - started,
      assets: result.graph.assets.length,
      lowConfidence: result.lowConfidenceAssetIds.length,
      repairs: result.repairs.length,
    });

    // Enrichment: geocode + nearest station. Deliberately non-fatal — a
    // Nominatim outage degrades onboarding, it never blocks it.
    let enrichment: { geocode: GeocodeResult; nearestStation: NearestStationResult | null } | null =
      null;
    try {
      // GPS coordinates win; reverse-geocode only fills in the state/display
      // name. If reverse lookup fails we still proceed with raw coordinates.
      const geocode = hasGps
        ? await reverseGeocode(gpsLat, gpsLng).catch(
            (): GeocodeResult => ({
              lat: gpsLat,
              lng: gpsLng,
              displayName: address || `${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`,
              stateCode: null,
            })
          )
        : await geocodeAddress(address);
      const nearestStation = resolveNearestStation(
        geocode.lat,
        geocode.lng,
        (await getKnownStations()).map((s) => ({
          stationId: s.station_id,
          stationName: s.station_name,
        }))
      );
      enrichment = { geocode, nearestStation };
      await updateShopLocation(shop.id, {
        lat: geocode.lat,
        lng: geocode.lng,
        stateCode: geocode.stateCode,
        nearestStationId: nearestStation?.stationId ?? null,
        // GPS-only flow: replace the placeholder with the real street address.
        address: !address ? geocode.displayName : undefined,
      });
      logger.info("shop enriched", {
        shopId: shop.id,
        stateCode: geocode.stateCode,
        nearestStation: nearestStation?.stationName,
        distanceKm: nearestStation?.distanceKm,
      });
    } catch (err) {
      logger.warn("enrichment failed (continuing without it)", {
        shopId: shop.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const siteGraph = await createSiteGraph(
      shop.id,
      result.graph,
      photoUrls,
      enrichment ?? undefined
    );

    return NextResponse.json({
      shopId: shop.id,
      siteGraphId: siteGraph.id,
      version: siteGraph.version,
      graph: result.graph,
      repairs: result.repairs,
      lowConfidenceAssetIds: result.lowConfidenceAssetIds,
      enrichment,
      botUsername: getConfig().TELEGRAM_BOT_USERNAME,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("onboarding failed", { error: message });
    return NextResponse.json(
      { error: `survey failed: ${message}. Try clearer photos or fewer of them.` },
      { status: 502 }
    );
  }
}
