import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createFloodEvent, getStationName } from "@/lib/db/repositories/events.repo";
import { dispatchForTierChange } from "@/modules/trigger";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  stationId: z.string().min(1),
  tier: z.enum(["watch", "warning", "danger"]),
});

// Manual SIMULATE FLOOD trigger (judge console). Runs the exact same
// deterministic path a real threshold crossing does: flood event → cached
// playbook lookup → Telegram. No AI, no live InfoBanjir dependency.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "expected { stationId: string, tier: 'watch'|'warning'|'danger' }" },
      { status: 400 }
    );
  }

  const { stationId, tier } = parsed.data;
  const event = await createFloodEvent({ stationId, tier, simulated: true });
  const stationName = (await getStationName(stationId)) ?? stationId;

  const summary = await dispatchForTierChange({
    stationId,
    stationName,
    tier,
    floodEventId: event.id,
  });

  logger.warn(`SIMULATED_FLOOD station=${stationId} tier=${tier}`, {
    floodEventId: event.id,
    ...summary,
  });

  return NextResponse.json({
    ok: true,
    floodEventId: event.id,
    stationId,
    stationName,
    tier,
    dispatch: summary,
  });
}
