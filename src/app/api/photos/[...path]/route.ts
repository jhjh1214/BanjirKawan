import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

// Serves owner-uploaded photos from UPLOADS_DIR (before/after evidence in the
// loss report). Path-traversal-safe: resolved paths must stay inside the root.
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const root = path.resolve(getConfig().UPLOADS_DIR);
  const requested = path.resolve(root, ...params.path);

  if (!requested.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!requested.endsWith(".jpg")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(requested);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
