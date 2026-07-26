-- 0024: 계정 과목의 상위 카테고리(그룹)
-- 예: 수도광열비 → 전기·가스·수도 / 결제 수수료 → 결제·중개·플랫폼 수수료
-- 카테고리에는 예산을 책정하지 않는다. 대시보드에서 묶어 보여주기 위한 이름일 뿐이다.
-- nullable 가산적 추가 — 기존 계정 과목은 전부 null(= 화면에서 '미분류')로 남는다.

alter table categories add column if not exists group_name text;
