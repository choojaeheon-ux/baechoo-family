-- 0020: family_events — family calendar events (calendar tab)
-- Recurrence model: single series record + exceptions (excluded occurrence
-- start dates). Column is repeat_interval, not "interval" (PG type keyword).

create table if not exists family_events (
  id text primary key,
  title text not null,
  start_date date not null,
  end_date date,
  time text,
  assignee text not null check (assignee in ('chuchu','baejji','together')),
  memo text,
  recurrence text not null default 'none' check (recurrence in ('none','weekly','monthly')),
  repeat_interval integer not null default 1,
  repeat_until date,
  exceptions jsonb not null default '[]',
  created_at date,
  deleted_at timestamptz
);

alter table family_events enable row level security;

drop policy if exists family_all on family_events;
create policy family_all on family_events for all using (true) with check (true);

create index if not exists idx_family_events_start on family_events (start_date);
