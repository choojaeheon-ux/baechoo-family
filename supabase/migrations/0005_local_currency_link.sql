-- 배추가족 가계부 — 지역화폐 충전 거래 연동
-- 0001~0004 실행한 개인 Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.

-- 지역화폐: 충전 거래에 쓸 기본 카테고리·결제수단
alter table local_currencies
  add column if not exists default_category_id text,
  add column if not exists default_payment_method_id text;

-- 거래: 어떤 지역화폐 충전으로 생성됐는지 역링크 (삭제 시 잔액 보정용)
alter table transactions
  add column if not exists local_currency_id text;
