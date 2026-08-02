-- 0025: budget_versions — 예산 기준선을 버전으로 묶는다.
-- 각 버전이 start_month를 갖고, 어떤 달의 예산은
-- "start_month <= 그 달" 중 가장 늦은 버전의 행들이다.
-- 이렇게 해야 새 기준선을 만들어도 과거 달이 소급 변경되지 않는다.
--
-- 한글 이름은 여기서 넣지 않는다(0021에서 정한 규칙 — 인코딩 손상 방지).
-- v1 이름은 ASCII로 두고, 사용자가 앱에서 바꾼다.

create table if not exists budget_versions (
  id          text primary key,
  name        text not null,
  start_month text not null,
  memo        text,
  created_at  timestamptz default now()
);

alter table budget_versions enable row level security;
drop policy if exists family_all on budget_versions;
create policy family_all on budget_versions for all using (true) with check (true);
create index if not exists idx_budget_versions_start on budget_versions (start_month);

-- budgets를 버전에 묶는다.
alter table budgets add column if not exists version_id text references budget_versions(id);

-- v1 = 첫 기준. 시작월은 첫 거래월(2026-06).
insert into budget_versions (id, name, start_month)
values ('bv-1', 'v1', '2026-06')
on conflict (id) do nothing;

-- 기존 예산 전체를 v1으로 백필.
update budgets set version_id = 'bv-1' where version_id is null;

-- year_month 컬럼은 남긴다. 「이번 달만 조정」 개념은 폐지했지만
-- 되돌릴 여지를 두기 위해 컬럼과 기존 값을 보존한다.
