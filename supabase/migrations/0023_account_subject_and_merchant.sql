-- 0023: 계정과목(구 카테고리) 고정비/변동비 구분 + 거래처
-- 둘 다 nullable 추가(가산적) — 기존 행은 그대로 남는다.

-- 계정과목별 원가 성격: 'fixed'(고정비) | 'variable'(변동비) | null(미지정·수입 계정과목)
alter table categories add column if not exists cost_type text;

-- 거래처 (예: 이마트, 스타벅스)
alter table transactions add column if not exists merchant text;
