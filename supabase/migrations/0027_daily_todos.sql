-- 0027: daily todos -- checklist items grouped by category, checked per date.
-- Korean seed rows come from the loadAll bootstrap (JS), NOT here.
--
-- Apply in TWO passes:
--   (A) the create block below  -> BEFORE deploying the new code (additive, harmless)
--   (B) the drop block at the bottom -> AFTER the new code is live and verified
-- Dropping first would break the old code's loadAll and take the whole app down.

-- -- (A) create ---------------------------------------------------
create table if not exists daily_todo_categories (
  id text primary key,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at date
);

create table if not exists daily_todos (
  id text primary key,
  title text not null,
  category_id text not null,
  start_date date not null,
  end_date date,
  once_date date,
  done_dates jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at date
);

create table if not exists daily_todo_settings (
  id text primary key,
  goal_pct integer not null default 80
);

alter table daily_todo_categories enable row level security;
alter table daily_todos enable row level security;
alter table daily_todo_settings enable row level security;

drop policy if exists family_all on daily_todo_categories;
create policy family_all on daily_todo_categories for all using (true) with check (true);
drop policy if exists family_all on daily_todos;
create policy family_all on daily_todos for all using (true) with check (true);
drop policy if exists family_all on daily_todo_settings;
create policy family_all on daily_todo_settings for all using (true) with check (true);

create index if not exists idx_daily_todos_active on daily_todos (start_date, end_date);
create index if not exists idx_daily_todos_once on daily_todos (once_date);
create index if not exists idx_daily_todo_categories_sort on daily_todo_categories (sort_order);

-- -- (B) drop -- IRREVERSIBLE. Back up family_events to JSON first. --
-- drop table if exists family_events;
-- drop table if exists event_categories;
