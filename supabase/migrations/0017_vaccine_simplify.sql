-- 배추가족 — 예방접종 단순화: 차수(doses) 제거, 최근 접종일 하나만 유지.
-- 다음 예정일(next_due)과 주기(interval_months)는 lib/vaccine.ts에서 파생한다.
-- 0013이 만든 last_done을 0014가 지웠던 자리라, 되살리는 셈이다.

alter table baechoo_vaccines add column if not exists last_done date;

-- 기존 차수 기록 중 가장 최근 접종일을 끌어올려 리마인드가 끊기지 않게 한다.
update baechoo_vaccines
set last_done = (
  select max((d->>'date')::date)
  from jsonb_array_elements(doses) d
)
where doses is not null
  and jsonb_array_length(doses) > 0
  and last_done is null;

alter table baechoo_vaccines drop column if exists doses;
alter table baechoo_vaccines drop column if exists next_due;
alter table baechoo_vaccines drop column if exists interval_months;

drop index if exists idx_baechoo_vaccines_next_due;
create index if not exists idx_baechoo_vaccines_last_done
  on baechoo_vaccines(last_done);
