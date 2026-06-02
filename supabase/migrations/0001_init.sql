-- Delphi hosted web app — initial schema
-- Tables: runs (deliberation runs + reports), signal_trackers, retrospectives
-- Engine writes via the service-role key (bypasses RLS).
-- The web app reads via the user session (RLS below).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- runs: one row per Delphi analysis. Canonical home for the report.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  question      text not null,
  context       text,
  experts       int  not null default 5,
  rounds        int  not null default 3,
  status        text not null default 'pending'
                  check (status in ('pending', 'running', 'completed', 'error')),
  error         text,
  report        jsonb,
  report_md     text,
  total_tokens  bigint,
  cost_usd      numeric(12, 4),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists runs_user_id_idx     on public.runs (user_id);
create index if not exists runs_status_idx       on public.runs (status);
create index if not exists runs_started_at_idx    on public.runs (started_at desc);

-- ─────────────────────────────────────────────────────────────
-- signal_trackers: regime-signal monitoring, one row per report_slug.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.signal_trackers (
  id          uuid primary key default gen_random_uuid(),
  report_slug text not null unique,
  run_id      uuid references public.runs (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- retrospectives: calibration feedback, one row per report_slug.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.retrospectives (
  id          uuid primary key default gen_random_uuid(),
  report_slug text not null unique,
  run_id      uuid references public.runs (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.runs            enable row level security;
alter table public.signal_trackers enable row level security;
alter table public.retrospectives  enable row level security;

-- Authenticated users can read their own runs plus shared/demo runs (user_id null).
drop policy if exists runs_select on public.runs;
create policy runs_select on public.runs
  for select
  using (auth.uid() = user_id or user_id is null);

-- Authenticated users can create runs owned by themselves.
drop policy if exists runs_insert on public.runs;
create policy runs_insert on public.runs
  for insert
  with check (auth.uid() = user_id or user_id is null);

-- Signal trackers and retrospectives are readable by any authenticated user (MVP).
drop policy if exists signal_trackers_select on public.signal_trackers;
create policy signal_trackers_select on public.signal_trackers
  for select using (auth.role() = 'authenticated');

drop policy if exists retrospectives_select on public.retrospectives;
create policy retrospectives_select on public.retrospectives
  for select using (auth.role() = 'authenticated');

-- Note: the engine and API use the service-role key, which bypasses RLS for
-- all writes (run status updates, report persistence, tracker upserts).
