-- 거래내역 입력 순서 보존: created_at 추가
-- 같은 날짜 안에서 "가장 최근 입력이 맨 위"로 정렬하기 위함.
-- id가 random uuid라 입력 순서를 복원할 수 없어 컬럼이 필요하다.

-- default를 붙여 add하면 기존 행이 전부 now()로 채워져 백필이 무의미해진다 → 나중에 붙인다.
alter table transactions
  add column if not exists created_at timestamptz;

-- 기존 행은 입력 시각을 알 수 없다 → 거래일 자정으로 백필(날짜 그룹 안에서는 동률).
update transactions set created_at = date::timestamptz where created_at is null;

alter table transactions alter column created_at set default now();

create index if not exists idx_txn_created_at on transactions(created_at);
