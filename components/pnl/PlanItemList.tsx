"use client";

import { won } from "@/lib/format";
import { groupTotal, remainingMonths } from "@/lib/plan";
import { Card, SectionTitle, Pill } from "@/components/budget/ui";
import type { PlanGroup, PlanItem } from "@/lib/types";

function ItemRow({
  item,
  month,
  onEdit,
}: {
  item: PlanItem;
  month: string;
  onEdit: (i: PlanItem) => void;
}) {
  const left = remainingMonths(item.endYearMonth, month);
  const sub = [
    item.note,
    item.targetTotal != null ? `잔액 ${won(item.targetTotal)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      onClick={() => onEdit(item)}
      className="flex w-full items-center gap-2 py-2 text-left"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-ink">{item.name}</div>
        {sub && <div className="truncate text-[11px] text-stone">{sub}</div>}
      </div>
      {left != null && (
        <Pill tone={left <= 12 ? "gold" : "stone"}>{left}회 남음</Pill>
      )}
      <div className="w-24 shrink-0 text-right text-sm tabular-nums text-ink">
        {won(item.amount)}
      </div>
    </button>
  );
}

function Section({
  title,
  desc,
  items,
  total,
  month,
  onEdit,
  onAdd,
}: {
  title: string;
  desc?: string;
  items: PlanItem[];
  total: number;
  month: string;
  onEdit: (i: PlanItem) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <SectionTitle
        right={
          <span className="text-sm font-bold tabular-nums text-ink">
            {won(total)}
          </span>
        }
      >
        {title}
      </SectionTitle>
      <Card>
        {desc && <p className="mb-1 text-[11px] text-stone">{desc}</p>}
        <div className="divide-y divide-line">
          {items.map((i) => (
            <ItemRow key={i.id} item={i} month={month} onEdit={onEdit} />
          ))}
        </div>
        <button
          onClick={onAdd}
          className="mt-2 w-full rounded-xl border border-dashed border-line py-2 text-sm text-stone"
        >
          + 항목 추가
        </button>
      </Card>
    </>
  );
}

export default function PlanItemList({
  items,
  month,
  onEdit,
  onAdd,
}: {
  items: PlanItem[];
  month: string;
  onEdit: (i: PlanItem) => void;
  onAdd: (group: PlanGroup, conditional: boolean) => void;
}) {
  const bySort = (a: PlanItem, b: PlanItem) => a.sortOrder - b.sortOrder;
  const pick = (g: PlanGroup, cond?: boolean) =>
    items
      .filter((i) => i.group === g)
      .filter((i) => cond === undefined || i.conditional === cond)
      .sort(bySort);

  return (
    <div>
      <Section
        title="수입"
        items={pick("income")}
        total={groupTotal(items, "income")}
        month={month}
        onEdit={onEdit}
        onAdd={() => onAdd("income", false)}
      />
      <Section
        title="월 지출"
        items={pick("spending")}
        total={groupTotal(items, "spending")}
        month={month}
        onEdit={onEdit}
        onAdd={() => onAdd("spending", false)}
      />
      <Section
        title="저축·상환"
        items={pick("saving", false)}
        total={groupTotal(items, "saving", false)}
        month={month}
        onEdit={onEdit}
        onAdd={() => onAdd("saving", false)}
      />
      <Section
        title="여유 시 집행"
        desc="최우선은 아니다. 부모급여·아동수당이 들어오면 집행한다."
        items={pick("saving", true)}
        total={groupTotal(items, "saving", true)}
        month={month}
        onEdit={onEdit}
        onAdd={() => onAdd("saving", true)}
      />
    </div>
  );
}
