-- 배추가족 가계부 — 무지출 챌린지 (보상 규칙·쿠폰)
-- 0001~0003 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

create table if not exists reward_rules (
  id text primary key,
  days int not null,          -- 달성 누적 무지출 일수
  name text not null          -- 보상 이름 (예: 배달 1회권)
);

create table if not exists coupons (
  id text primary key,
  rule_id text,
  name text not null,
  earned_year_month text not null, -- YYYY-MM
  used boolean not null default false
);

alter table reward_rules enable row level security;
alter table coupons enable row level security;
drop policy if exists "family_all" on reward_rules;
create policy "family_all" on reward_rules
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "family_all" on coupons;
create policy "family_all" on coupons
  for all to anon, authenticated using (true) with check (true);
