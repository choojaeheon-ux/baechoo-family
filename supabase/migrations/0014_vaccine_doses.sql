-- 배추가족 — 예방접종 차수(doses) 모델로 전환
-- 0013 baechoo_vaccines에 차수 배열 컬럼 추가, 단순 history/last_done 제거.

alter table baechoo_vaccines add column if not exists doses jsonb not null default '[]'::jsonb;
alter table baechoo_vaccines drop column if exists history;
alter table baechoo_vaccines drop column if exists last_done;
