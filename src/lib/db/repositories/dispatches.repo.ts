import { getPool } from "@/lib/db/client";

export type DispatchStatus = "queued" | "sent" | "failed" | "dead";

export interface DispatchRow {
  id: string;
  playbook_id: string | null;
  flood_event_id: string | null;
  channel: string;
  status: DispatchStatus;
  completed_actions: unknown[];
  sent_at: Date | null;
  updated_at: Date;
}

export async function createDispatch(input: {
  playbookId: string;
  floodEventId: string;
  channel?: string;
}): Promise<DispatchRow> {
  const { rows } = await getPool().query<DispatchRow>(
    `insert into dispatches (playbook_id, flood_event_id, channel)
     values ($1, $2, coalesce($3, 'telegram'))
     returning *`,
    [input.playbookId, input.floodEventId, input.channel ?? null]
  );
  return rows[0];
}

export async function updateDispatchStatus(id: string, status: DispatchStatus): Promise<void> {
  await getPool().query(
    `update dispatches
     set status = $2,
         sent_at = case when $2 = 'sent' then now() else sent_at end,
         updated_at = now()
     where id = $1`,
    [id, status]
  );
}

export async function listDispatches(limit = 50): Promise<DispatchRow[]> {
  const { rows } = await getPool().query<DispatchRow>(
    "select * from dispatches order by updated_at desc limit $1",
    [limit]
  );
  return rows;
}
