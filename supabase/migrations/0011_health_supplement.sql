-- 건강 기록 종류에 '영양제'(supplement) 추가
-- 기존 health_type CHECK 제약을 갱신
alter table baechoo_health
  drop constraint if exists baechoo_health_health_type_check;

alter table baechoo_health
  add constraint baechoo_health_health_type_check
  check (health_type in (
    'hospital','vaccine','medicine','supplement','symptom','note','dental','etc'
  ));
