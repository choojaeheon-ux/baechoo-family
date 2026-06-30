-- 배추가족 — 배추 예방접종 체크리스트 (매년 부스터)
-- 0001~0012 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

create table if not exists baechoo_vaccines (
  id text primary key,
  name text not null,
  last_done date,                    -- 마지막 접종일 (미접종이면 null)
  next_due date,                     -- 다음 예정일 (미접종이면 null)
  interval_months int not null default 12,
  history jsonb not null default '[]'::jsonb,  -- 접종일 배열
  memo text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz             -- 소프트 삭제(휴지통)
);

alter table baechoo_vaccines enable row level security;
drop policy if exists "family_all" on baechoo_vaccines;
create policy "family_all" on baechoo_vaccines
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_vaccines_next_due on baechoo_vaccines(next_due);
