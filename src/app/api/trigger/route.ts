import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createFloodEvent } from "@/lib/db/repositories/events.repo";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  stationId: z.string().min(1),
  tier: z.enum(["watch", "warning", "danger"]),
});

// Manual SIMULATE FLOOD trigger (judge console). The worker owns real polling;
// this route lets the demo fire the pipeline without waiting for a real flood.
// Day 5 wires this into the dispatcher; today it records the event and logs.
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

  logger.warn(`SIMULATED_FLOOD station=${stationId} tier=${tier}`, {
    floodEventId: event.id,
  });

  return NextResponse.json({ ok: true, floodEventId: event.id, stationId, tier });
}
