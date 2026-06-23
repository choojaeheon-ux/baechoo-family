-- 배추가족 — 우주 체크리스트 (기한 있는 준비 항목 + D-day)
-- 0001~0011 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

-- 우주 체크리스트 (예방접종·출산 준비물 등, 항목별 기한 D-day)
create table if not exists uju_checklists (
  id text primary key,
  title text not null,
  due_date date not null,        -- 기한 (절대 날짜, YYYY-MM-DD)
  done boolean not null default false,
  completed_at date,             -- 완료일
  memo text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz         -- 소프트 삭제(휴지통)
);

alter table uju_checklists enable row level security;
drop policy if exists "family_all" on uju_checklists;
create policy "family_all" on uju_checklists
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_uju_checklists_due on uju_checklists(due_date);
