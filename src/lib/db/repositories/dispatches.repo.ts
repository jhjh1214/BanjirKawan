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

/** Everything the check-off callback needs, in one query. */
export interface DispatchCheckoffContext {
  dispatch_id: string;
  completed_actions: number[];
  action_orders: number[];
  language: string;
  telegram_chat_id: string | null;
}

export async function getDispatchCheckoffContext(
  dispatchId: string
): Promise<DispatchCheckoffContext | null> {
  const { rows } = await getPool().query<DispatchCheckoffContext>(
    `select d.id as dispatch_id,
            coalesce(array(select jsonb_array_elements_text(d.completed_actions)::int), '{}') as completed_actions,
            array(select (a->>'order')::int from jsonb_array_elements(p.actions) a order by (a->>'order')::int) as action_orders,
            s.language,
            s.telegram_chat_id
     from dispatches d
     join playbooks p on p.id = d.playbook_id
     join shops s on s.id = p.shop_id
     where d.id = $1`,
    [dispatchId]
  );
  return rows[0] ?? null;
}

/** Idempotently record a completed action; returns the updated completed set. */
export async function appendCompletedAction(dispatchId: string, order: number): Promise<number[]> {
  const { rows } = await getPool().query<{ completed_actions: number[] }>(
    `update dispatches
     set completed_actions = (
           select coalesce(jsonb_agg(distinct v order by v), '[]')
           from (
             select jsonb_array_elements(completed_actions)::int as v
             union select $2::int
           ) u
         ),
         updated_at = now()
     where id = $1
     returning array(select jsonb_array_elements_text(completed_actions)::int) as completed_actions`,
    [dispatchId, order]
  );
  return rows[0]?.completed_actions ?? [];
}

export async function listDispatches(limit = 50): Promise<DispatchRow[]> {
  const { rows } = await getPool().query<DispatchRow>(
    "select * from dispatches order by updated_at desc limit $1",
    [limit]
  );
  return rows;
}
