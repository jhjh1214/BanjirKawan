import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listPlaybooksForShop } from "@/lib/db/repositories/playbooks.repo";
import { generateShopPlaybooks } from "@/modules/playbook";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/playbook?shopId=… → the cached playbook set (what the dispatcher reads on Day 5)
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ error: "shopId query param required" }, { status: 400 });

  const rows = await listPlaybooksForShop(shopId);
  return NextResponse.json({
    shopId,
    count: rows.length,
    playbooks: rows.map((r) => ({
      id: r.id,
      tier: r.tier,
      language: r.language,
      siteGraphVersion: r.site_graph_version,
      actions: r.actions,
      createdAt: r.created_at,
    })),
  });
}

const postSchema = z.object({ shopId: z.string().uuid() });

// POST /api/playbook {shopId} → (re)generate the full set now, synchronously.
// Slow (~6 AI calls); the normal path is the fire-and-forget kick from confirm.
export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "expected { shopId: uuid }" }, { status: 400 });
  }
  const result = await generateShopPlaybooks(parsed.data.shopId);
  const status = result.generated.length > 0 ? 200 : 502;
  return NextResponse.json(result, { status });
}
