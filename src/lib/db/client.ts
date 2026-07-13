import { Pool } from "pg";
import { getConfig } from "@/lib/config";

// Server-side only. Next.js hot-reload creates new module instances in dev,
// so stash the pool on globalThis to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = new Pool({
      connectionString: getConfig().DATABASE_URL,
      max: 5,
    });
  }
  return globalForDb.__pgPool;
}

export async function closePool(): Promise<void> {
  if (globalForDb.__pgPool) {
    await globalForDb.__pgPool.end();
    globalForDb.__pgPool = undefined;
  }
}
