-- 배추가족 가계부 — 초기 스키마
-- 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

create table if not exists categories (
  id text primary key,
  name text not null,
  type text not null check (type in ('income','expense')),
  color text not null,
  icon text
);

create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  category_id text references categories(id),
  day_of_month int not null,
  start_date date not null,
  end_date date,
  is_installment boolean not null default false,
  installment_total_months int,
  installment_paid_months int not null default 0,
  memo text
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric not null,
  type text not null check (type in ('income','expense')),
  category_id text references categories(id),
  memo text,
  member text not null,
  source text not null default 'manual' check (source in ('manual','auto')),
  recurring_id uuid,
  is_paid boolean not null default true
);
create index if not exists idx_txn_date on transactions(date);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  category_id text references categories(id),
  amount numeric not null
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline date
);

-- 기본 카테고리 시드
insert into categories (id, name, type, color, icon) values
  ('cat-food','식비','expense','#e07a5f','🍚'),
  ('cat-living','생활','expense','#8ab560','🧺'),
  ('cat-card','카드값','expense','#5c93a8','💳'),
  ('cat-saving','적금','expense','#5b8c3e','🐖'),
  ('cat-housing','청약','expense','#d9a441','🏠'),
  ('cat-installment','할부','expense','#b06fb0','🧾'),
  ('cat-baechoo','배추(반려)','expense','#6fae8e','🐶'),
  ('cat-uju','우주(육아)','expense','#e8a0bf','🍼'),
  ('cat-medical','의료/건강','expense','#c96f6f','💊'),
  ('cat-leisure','문화/여가','expense','#7a8cd0','🎬'),
  ('cat-etc','기타','expense','#9a948a','📦'),
  ('cat-salary','급여','income','#3f6b2a','💼'),
  ('cat-income-etc','기타수입','income','#4f8a6f','💰')
on conflict (id) do nothing;

-- RLS: 가족 공용 앱이므로 anon 키로 전체 접근 허용
alter table categories enable row level security;
alter table recurring_expenses enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','recurring_expenses','transactions','budgets','goals']
  loop
    execute format('drop policy if exists "family_all" on %I;', t);
    execute format('create policy "family_all" on %I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;
