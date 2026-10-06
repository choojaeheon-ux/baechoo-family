-- 0028 baechoo record/pattern overhaul (additive, idempotent)
-- Spec: docs/superpowers/specs/2026-10-06-*-design.md
-- Apply BEFORE merging feat/app-overhaul (new code writes these columns).

-- (1) time of day for health records (the "etc" quick button). HH:MM, nullable.
alter table baechoo_health add column if not exists time text;

-- (2) stool records made outside a walk (walk.stools stays as is)
create table if not exists baechoo_stools (
  id text primary key,
  date date not null,
  time text,
  state text not null default 'normal'
    check (state in ('normal','oily','loose','diarrhea','watery','fail')),
  memo text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table baechoo_stools enable row level security;
drop policy if exists "family_all" on baechoo_stools;
create policy "family_all" on baechoo_stools
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_stools_date on baechoo_stools(date);

-- refresh PostgREST schema cache so the app can write the new column/table right away
notify pgrst, 'reload schema';
