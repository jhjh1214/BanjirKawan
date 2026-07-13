-- Timestamped check-off telemetry. dispatches.completed_actions (jsonb int
-- array) remains the fast read for keyboard rendering; this table adds WHEN
-- each action was completed — the source for time-to-first-action metrics.

create table if not exists dispatch_checkoffs (
  id bigint generated always as identity primary key,
  dispatch_id uuid not null references dispatches (id),
  action_order int not null,
  checked_at timestamptz not null default now(),
  unique (dispatch_id, action_order)
);

create index if not exists idx_dispatch_checkoffs_dispatch on dispatch_checkoffs (dispatch_id);
