-- 배추가족 — 52주 투두: 날짜 미정 허용
-- week_num을 nullable로 (null = 날짜 미정, 별도 탭에서 관리)

alter table week_todos alter column week_num drop not null;
