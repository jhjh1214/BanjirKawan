import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listShopsByStation } from "@/lib/db/repositories/shops.repo";
import { getLatestValidatedPlaybook } from "@/lib/db/repositories/playbooks.repo";
import { getStationName } from "@/lib/db/repositories/events.repo";
import { formatSmsChecklist, resolveMessageLanguage } from "@/modules/delivery";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  stationId: z.string().min(1),
  tier: z.enum(["watch", "warning", "danger"]),
});

// Judge-console proof of the SMS fallback: renders the same cached playbooks
// the dispatcher would send, compressed to SMS segments. No gateway account —
// the design (channel interface + deterministic renderer) is the point.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "expected { stationId, tier }" }, { status: 400 });
  }

  const { stationId, tier } = parsed.data;
  const stationName = (await getStationName(stationId)) ?? stationId;
  const shops = await listShopsByStation(stationId);

  const previews: Array<{ shopName: string; segments: string[] }> = [];
  for (const shop of shops) {
    const playbook = await getLatestValidatedPlaybook(shop.id, tier, shop.language);
    if (!playbook) continue;
    previews.push({
      shopName: shop.name,
      segments: formatSmsChecklist({
        playbook: { tier: playbook.tier, actions: playbook.actions },
        stationName,
        language: resolveMessageLanguage(shop.language),
      }),
    });
  }

  return NextResponse.json({ stationId, stationName, tier, previews });
}
