-- 배추가족 — 매달 반복 예산: year_month를 nullable로(null = 기본 예산, 'YYYY-MM' = 그 달 오버라이드)
-- 개인 Supabase SQL Editor에서 실행하세요.
alter table budgets alter column year_month drop not null;
