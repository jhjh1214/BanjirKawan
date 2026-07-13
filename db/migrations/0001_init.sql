-- BanjirKawan initial schema (BLUEPRINT.md §3 + system_status for worker heartbeat)

create extension if not exists pgcrypto;

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  state_code text,
  nearest_station_id text,
  language text not null default 'ms',
  telegram_chat_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shops_nearest_station on shops (nearest_station_id);

-- Append-only: new version per revision, never update in place.
create table if not exists site_graphs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  version int not null,
  graph jsonb not null,
  photo_urls text[] not null default '{}',
  enrichment jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (shop_id, version)
);

-- Append-only CACHE: the storm-time path only ever reads the latest validated row.
create table if not exists playbooks (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  site_graph_version int not null,
  tier text not null check (tier in ('watch', 'warning', 'danger')),
  language text not null default 'ms',
  actions jsonb not null,
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_playbooks_shop_tier on playbooks (shop_id, tier, created_at desc);

create table if not exists river_readings (
  id bigint generated always as identity primary key,
  station_id text not null,
  station_name text not null,
  state_code text not null,
  level_m numeric,
  threshold_state text,
  raw jsonb,
  ts timestamptz not null default now()
);

create index if not exists idx_river_readings_station_ts on river_readings (station_id, ts desc);

create table if not exists flood_events (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  tier text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  simulated boolean not null default false
);

-- Audit trail = the metrics slide, for free.
create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid references playbooks (id),
  flood_event_id uuid references flood_events (id),
  channel text not null default 'telegram',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'dead')),
  completed_actions jsonb not null default '[]',
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_dispatches_status on dispatches (status);

create table if not exists outcomes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  flood_event_id uuid references flood_events (id),
  report_text text,
  photo_urls text[] not null default '{}',
  damage_items jsonb,
  graph_diff jsonb,
  loss_report_url text,
  created_at timestamptz not null default now()
);

-- Tiny key-value table: worker heartbeat + misc system state.
create table if not exists system_status (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
