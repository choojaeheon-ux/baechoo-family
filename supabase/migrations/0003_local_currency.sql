-- 배추가족 가계부 — 지역화폐(온누리·경기지역화폐 등) 관리
-- 0001/0002 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

create table if not exists local_currencies (
  id text primary key,
  name text not null,
  balance numeric not null default 0,       -- 이월 포함 현재 잔액
  monthly_charge numeric not null default 0 -- 매월 충전금(기본값)
);

alter table local_currencies enable row level security;
drop policy if exists "family_all" on local_currencies;
create policy "family_all" on local_currencies
  for all to anon, authenticated using (true) with check (true);
