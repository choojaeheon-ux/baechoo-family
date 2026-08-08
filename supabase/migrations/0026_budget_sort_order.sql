-- 0026: budgets.sort_order — 예산 과목의 표시 순서를 사람이 정한다.
-- 버전별이다(예산 행에 붙으므로). 카테고리 순서는 소속 과목의 최소 sort_order로
-- 파생하므로 별도 컬럼을 두지 않는다.

alter table budgets add column if not exists sort_order integer;

-- 기존 행 백필 — 지금 화면에 보이는 순서(카테고리명 → 과목명) 그대로 0부터.
-- group_name이 null인 과목("미분류")은 뒤로 보낸다(화면과 같은 규칙).
with ordered as (
  select
    b.id,
    row_number() over (
      partition by b.version_id
      order by (c.group_name is null), c.group_name, c.name
    ) - 1 as rn
  from budgets b
  join categories c on c.id = b.category_id
  where b.category_id is not null
)
update budgets
set sort_order = ordered.rn
from ordered
where budgets.id = ordered.id
  and budgets.sort_order is null;
