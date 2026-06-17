-- 배추가족 가계부 — 모델 확장 (결제수단·특수지출·습관태그·고정지출 종류)
-- 0001 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

-- 결제수단
create table if not exists payment_methods (
  id text primary key,
  name text not null,
  kind text not null default 'card' check (kind in ('card','cash','account'))
);
insert into payment_methods (id, name, kind) values
  ('pm-cash','현금','cash'),
  ('pm-account','계좌이체','account')
on conflict (id) do nothing;

-- 거래내역 확장
alter table transactions add column if not exists payment_method_id text references payment_methods(id);
alter table transactions add column if not exists is_special boolean not null default false;
alter table transactions add column if not exists habit_tag text;

-- 고정지출 확장 (종류·결제수단)
alter table recurring_expenses add column if not exists kind text not null default 'fixed';
alter table recurring_expenses add column if not exists payment_method_id text references payment_methods(id);
-- 기존 할부 항목은 kind=installment 로 이관
update recurring_expenses set kind = 'installment'
  where is_installment = true and (kind is null or kind = 'fixed');

-- RLS (가족 공용 anon 전체 허용)
alter table payment_methods enable row level security;
drop policy if exists "family_all" on payment_methods;
create policy "family_all" on payment_methods
  for all to anon, authenticated using (true) with check (true);
