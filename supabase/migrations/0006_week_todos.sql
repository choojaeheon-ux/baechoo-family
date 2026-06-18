-- 배추가족 — 52주 투두
-- 0001~0005 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

create table if not exists week_todos (
  id text primary key,
  year int not null,
  week_num int not null,        -- 1~52, 직접 선택
  title text not null,          -- 할 일 내용
  assignee text not null default 'together', -- chuchu | baejji | together
  due_date date,                -- 언제까지 (선택)
  memo text,                    -- 요청사항 메모
  status text not null default 'pending' check (status in ('pending','done','cancelled')),
  defer_count int not null default 0, -- 미룸 횟수
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table week_todos enable row level security;
drop policy if exists "family_all" on week_todos;
create policy "family_all" on week_todos
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_week_todos_yw on week_todos(year, week_num);
