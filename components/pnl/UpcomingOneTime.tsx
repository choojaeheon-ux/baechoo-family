"use client";

import { won } from "@/lib/format";
import { upcomingOneTime } from "@/lib/plan";
import { Card, SectionTitle } from "@/components/budget/ui";
import type { PlanItem } from "@/lib/types";

// "2026-08" → "8월"
const monthLabel = (ym: string) => `${Number(ym.slice(5, 7))}월`;

export default function UpcomingOneTime({
  items,
  month,
  onEdit,
  onAdd,
}: {
  items: PlanItem[];
  month: string;
  onEdit: (i: PlanItem) => void;
  onAdd: () => void;
}) {
  const upcoming = upcomingOneTime(items, month);
  const total = upcoming.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <SectionTitle
        right={
          upcoming.length > 0 ? (
            <span className="text-sm font-bold tabular-nums text-ink">
              {won(total)}
            </span>
          ) : undefined
        }
      >
        다가오는 1회성 지출
      </SectionTitle>
      <Card>
        {upcoming.length > 0 ? (
          <>
            <p className="mb-1 text-[11px] text-stone">
              이번 달 잔액에는 안 잡힌다. 그 달로 넘어가야 반영된다.
            </p>
            <div className="divide-y divide-line">
              {upcoming.map((i) => (
                <button
                  key={i.id}
                  onClick={() => onEdit(i)}
                  className="flex w-full items-center gap-2 py-2 text-left"
                >
                  <span className="w-10 shrink-0 text-sm font-bold text-leaf-dark">
                    {monthLabel(i.startYearMonth!)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {i.name}
                  </span>
                  <span className="w-24 shrink-0 text-right text-sm tabular-nums text-ink">
                    {won(i.amount)}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="py-1 text-[11px] text-stone">
            앞으로 예정된 1회성 지출이 없다. 큰 지출을 미리 꽂아두면 그 달에만
            반영된다.
          </p>
        )}
        <button
          onClick={onAdd}
          className="mt-2 w-full rounded-xl border border-dashed border-line py-2 text-sm text-stone"
        >
          + 1회성 지출 추가
        </button>
      </Card>
    </>
  );
}
