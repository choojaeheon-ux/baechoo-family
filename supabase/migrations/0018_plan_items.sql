-- 0018: plan_items — monthly budget plan (family P&L "plan" tab)
-- group is the UI section (income/spending/saving);
-- pnl_class is the accounting bucket. They are independent:
-- e.g. student loan repayment is group=saving but pnl_class=fixed.

create table if not exists plan_items (
  id text primary key,
  "group" text not null check ("group" in ('income','spending','saving')),
  name text not null,
  amount integer not null,
  pnl_class text not null check (pnl_class in ('revenue','fixed','saving','variable')),
  conditional boolean not null default false,
  end_year_month text,
  target_total integer,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table plan_items enable row level security;

drop policy if exists family_all on plan_items;
create policy family_all on plan_items for all using (true) with check (true);

create index if not exists idx_plan_items_sort on plan_items (sort_order);
