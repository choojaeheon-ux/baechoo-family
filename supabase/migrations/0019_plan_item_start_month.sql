-- 0019: plan_items.start_year_month -- one-time / bounded-start plan items
-- An item is active when: start_year_month <= month <= end_year_month
-- (null = unbounded). A one-time item has start == end.
-- Additive only: existing rows get null and keep their current behaviour.

alter table plan_items add column if not exists start_year_month text;
