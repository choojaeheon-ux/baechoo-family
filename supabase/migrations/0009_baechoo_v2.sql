-- 배추가족 — 배추 생활기록부 개선 (카테고리·건강투두·측정항목 일반화)
-- 0001~0008 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

-- 편집 가능한 옵션 리스트 (사료종류·토핑종류·측정항목 공용)
create table if not exists baechoo_categories (
  id text primary key,
  "group" text not null check ("group" in ('food','topping','measure')),
  name text not null,
  unit text,                    -- measure만 사용 (kg·cm 등)
  created_at timestamptz not null default now()
);

alter table baechoo_categories enable row level security;
drop policy if exists "family_all" on baechoo_categories;
create policy "family_all" on baechoo_categories
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_categories_group on baechoo_categories("group");

-- 측정항목 기본값 (체중/kg) 시드
insert into baechoo_categories (id, "group", name, unit)
values ('bcat-weight', 'measure', '체중', 'kg')
on conflict (id) do nothing;

-- 건강 투두 (once: 약·접종 D-day / daily: 양치 등 매일 체크)
create table if not exists baechoo_health_todos (
  id text primary key,
  title text not null,
  kind text not null default 'once' check (kind in ('once','daily')),
  due_date date,                -- once: 예정일
  done boolean not null default false,   -- once: 완료 여부
  completed_at date,            -- once: 완료일
  done_dates jsonb not null default '[]'::jsonb, -- daily: 체크된 날짜 배열
  created_at timestamptz not null default now()
);

alter table baechoo_health_todos enable row level security;
drop policy if exists "family_all" on baechoo_health_todos;
create policy "family_all" on baechoo_health_todos
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_health_todos_due on baechoo_health_todos(due_date);

-- 신체검사: 체중 → 측정항목 일반화 (목둘레 등)
alter table baechoo_exams add column if not exists measure_name text;
alter table baechoo_exams add column if not exists value numeric;
alter table baechoo_exams add column if not exists unit text;

-- 기존 weight 행 백필 (체중/kg)
update baechoo_exams
  set measure_name = '체중', value = weight, unit = 'kg'
  where exam_type = 'measure' and weight is not null and measure_name is null;
