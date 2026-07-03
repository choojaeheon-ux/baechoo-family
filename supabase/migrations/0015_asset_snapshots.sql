-- 배추가족 — 가족 P&L: 월말 총자산 스냅샷 (현금+계좌+투자 잔액 합계)
-- 0001~0014 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

create table if not exists asset_snapshots (
  id text primary key,
  year_month text not null,
  total_assets numeric not null default 0
);

alter table asset_snapshots enable row level security;
drop policy if exists "family_all" on asset_snapshots;
create policy "family_all" on asset_snapshots
  for all to anon, authenticated using (true) with check (true);

create unique index if not exists idx_asset_snapshots_year_month
  on asset_snapshots(year_month);
