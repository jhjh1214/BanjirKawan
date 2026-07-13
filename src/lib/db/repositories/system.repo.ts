import { getPool } from "@/lib/db/client";

export async function upsertSystemStatus(key: string, value: unknown): Promise<void> {
  await getPool().query(
    `insert into system_status (key, value, updated_at)
     values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

export async function getSystemStatus(
  key: string
): Promise<{ value: unknown; updated_at: Date } | null> {
  const { rows } = await getPool().query<{ value: unknown; updated_at: Date }>(
    "select value, updated_at from system_status where key = $1",
    [key]
  );
  return rows[0] ?? null;
}
