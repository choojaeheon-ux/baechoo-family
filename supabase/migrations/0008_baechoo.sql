-- 배추가족 — 배추 생활기록부 (식사·건강·신체검사)
-- 0001~0007 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

-- 식사/간식
create table if not exists baechoo_meals (
  id text primary key,
  date date not null,
  meal_type text not null default 'meal' check (meal_type in ('meal','snack')), -- 식사 | 간식
  time text,                    -- HH:MM
  content text not null,        -- 식사=사료종류, 간식=종류
  topping text,                 -- 토핑종류 (식사만)
  amount text,                  -- 실제로 먹은 양 (자유 텍스트)
  memo text,
  created_at timestamptz not null default now()
);

alter table baechoo_meals enable row level security;
drop policy if exists "family_all" on baechoo_meals;
create policy "family_all" on baechoo_meals
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_meals_date on baechoo_meals(date);

-- 건강 (병원·접종·약·증상·특이사항·양치·기타)
create table if not exists baechoo_health (
  id text primary key,
  date date not null,
  health_type text not null default 'etc'
    check (health_type in ('hospital','vaccine','medicine','symptom','note','dental','etc')),
  title text not null,          -- 내용 (증상·특이사항·양치 방법·검진명 등)
  next_date date,               -- 다음 예정일 (재방문·다음 접종)
  memo text,
  created_at timestamptz not null default now()
);

alter table baechoo_health enable row level security;
drop policy if exists "family_all" on baechoo_health;
create policy "family_all" on baechoo_health
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_health_date on baechoo_health(date);

-- 신체검사 (체중측정 · 관리)
create table if not exists baechoo_exams (
  id text primary key,
  date date not null,
  exam_type text not null default 'measure' check (exam_type in ('measure','care')), -- 체중측정 | 관리
  weight numeric,               -- kg (체중측정만)
  content text,                 -- 관리 내용 (관리만)
  memo text,
  created_at timestamptz not null default now()
);

alter table baechoo_exams enable row level security;
drop policy if exists "family_all" on baechoo_exams;
create policy "family_all" on baechoo_exams
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_baechoo_exams_date on baechoo_exams(date);
