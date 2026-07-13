import { NextRequest, NextResponse } from "next/server";
import { getEventMetrics, getOverviewMetrics } from "@/modules/metrics";

export const dynamic = "force-dynamic";

// GET /api/metrics            → overview + recent events
// GET /api/metrics?eventId=…  → one flood event (judge console live strip)
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (eventId) {
    const metrics = await getEventMetrics(eventId);
    if (!metrics) return NextResponse.json({ error: "flood event not found" }, { status: 404 });
    return NextResponse.json(metrics);
  }

  const { overview, recentEvents } = await getOverviewMetrics();
  return NextResponse.json({ overview, recentEvents });
}
