-- 배추 산책 기록 — GPS 경로 + 소요·거리 + 응가
create table if not exists baechoo_walks (
  id text primary key,
  date date not null,
  start_time timestamptz,         -- 산책 시작 시각 (ISO)
  duration_sec int not null default 0,    -- 소요 (초)
  distance_m numeric not null default 0,  -- 거리 (m)
  route jsonb not null default '[]'::jsonb,   -- {lat,lng}[] 추적 좌표
  stools jsonb not null default '[]'::jsonb,  -- {state,time,lat,lng}[] 응가
  memo text,
  created_at timestamptz not null default now()
);

alter table baechoo_walks enable row level security;
drop policy if exists "family_all" on baechoo_walks;
create policy "family_all" on baechoo_walks
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_walks_date on baechoo_walks(date);
