-- 0021: event_categories — user-managed calendar categories (color + name).
-- Replaces the fixed family_events.assignee axis. Korean default names are
-- seeded from JS (loadAll bootstrap), NOT here, to avoid encoding corruption.

create table if not exists event_categories (
  id text primary key,
  name text not null,
  color text not null,
  emoji text,
  sort_order integer not null default 0,
  created_at date
);

alter table event_categories enable row level security;
drop policy if exists family_all on event_categories;
create policy family_all on event_categories for all using (true) with check (true);
create index if not exists idx_event_categories_sort on event_categories (sort_order);

-- family_events: add category_id, backfill from assignee (ASCII enum -> safe).
alter table family_events add column if not exists category_id text;
update family_events set category_id = 'cat-' || assignee where category_id is null;

-- New code stops writing assignee; relax NOT NULL + CHECK so inserts succeed.
-- (assignee column kept for rollback; a later migration drops it.)
alter table family_events alter column assignee drop not null;
alter table family_events drop constraint if exists family_events_assignee_check;
