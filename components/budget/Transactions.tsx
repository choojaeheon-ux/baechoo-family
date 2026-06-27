"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { monthTransactions, sumBy } from "@/lib/compute";
import { won, weekdayKo } from "@/lib/format";
import { memberName, type Transaction, type TxType } from "@/lib/types";
import { Card, Empty, Pill } from "./ui";
import { TransactionForm } from "./forms";

export default function Transactions({ ym }: { ym: string }) {
  const { transactions, categoryById, paymentMethodById } = useData();
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [edit, setEdit] = useState<Transaction | null>(null);

  // 이번 달 + 타입 필터(전체/지출/수입)까지만 적용한 기준 목록 (카테고리 필터 전)
  const typeTxns = useMemo(
    () =>
      monthTransactions(transactions, ym).filter(
        (t) => filter === "all" || t.type === filter
      ),
    [transactions, ym, filter]
  );

  // 칩으로 보여줄 카테고리: 현재 타입 필터 안에서 거래가 있는 카테고리만, 금액 큰 순
  const chipCats = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of typeTxns)
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    return [...totals.entries()]
      .map(([id, amt]) => ({ cat: categoryById(id), amt }))
      .filter((r): r is { cat: NonNullable<typeof r.cat>; amt: number } => !!r.cat)
      .sort((a, b) => b.amt - a.amt);
  }, [typeTxns, categoryById]);

  // 선택한 카테고리가 현재 칩 목록에 없으면(타입 필터 변경 등) 자동으로 전체 취급
  const effCat =
    catFilter !== null && chipCats.some((r) => r.cat.id === catFilter)
      ? catFilter
      : null;

  const monthTxns = useMemo(
    () =>
      typeTxns
        .filter((t) => effCat === null || t.categoryId === effCat)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [typeTxns, effCat]
  );

  const grouped = useMemo(() => {
    const g = new Map<string, Transaction[]>();
    for (const t of monthTxns) g.set(t.date, [...(g.get(t.date) ?? []), t]);
    return [...g.entries()];
  }, [monthTxns]);

  // 요약(수입/지출/잔액): 카테고리 선택 시 그 카테고리 기준, 아니면 이번 달 전체
  const summaryBase = useMemo(() => {
    const all = monthTransactions(transactions, ym);
    return effCat === null ? all : all.filter((t) => t.categoryId === effCat);
  }, [transactions, ym, effCat]);

  const expense = sumBy(summaryBase, "expense");
  const income = sumBy(summaryBase, "income");

  return (
    <div className="space-y-2 pb-4">
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryBox label="수입" value={won(income)} tone="text-sky" />
        <SummaryBox label="지출" value={won(expense)} tone="text-coral" />
        <SummaryBox label="잔액" value={won(income - expense)} tone="text-ink" />
      </div>

      <div className="flex gap-1">
        {(["all", "expense", "income"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              filter === f ? "bg-leaf text-white" : "bg-card border border-line text-stone"
            }`}
          >
            {f === "all" ? "전체" : f === "expense" ? "지출" : "수입"}
          </button>
        ))}
      </div>

      {chipCats.length > 0 && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          <button
            onClick={() => setCatFilter(null)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
              effCat === null
                ? "bg-leaf text-white"
                : "bg-card border border-line text-stone"
            }`}
          >
            전체
          </button>
          {chipCats.map(({ cat }) => (
            <button
              key={cat.id}
              onClick={() => setCatFilter(cat.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
                effCat === cat.id
                  ? "bg-leaf text-white"
                  : "bg-card border border-line text-stone"
              }`}
            >
              {cat.icon ? `${cat.icon} ` : ""}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 ? (
        <Card>
          <Empty>
            이번 달 내역이 없어요.
            <br />
            오른쪽 아래 + 버튼으로 추가해 보세요.
          </Empty>
        </Card>
      ) : (
        grouped.map(([date, items]) => (
          <Card key={date} className="space-y-1">
            <p className="mb-1 px-1 text-xs font-semibold text-stone">
              {Number(date.slice(5, 7))}월 {Number(date.slice(8))}일 ({weekdayKo(date)})
            </p>
            {items.map((t) => {
              const cat = categoryById(t.categoryId);
              const pm = t.paymentMethodId
                ? paymentMethodById(t.paymentMethodId)
                : undefined;
              return (
                <button
                  key={t.id}
                  onClick={() => setEdit(t)}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-cream"
                >
                  <span className="text-xl">{cat?.icon ?? "•"}</span>
                  <div className="flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                      {t.isSpecial && <span title="특수지출">⭐</span>}
                      {t.memo || cat?.name || "내역"}
                    </p>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-stone">
                      <span>{cat?.name}</span>
                      {pm && <span>· {pm.name}</span>}
                      {t.habitTag && <Pill tone="coral">{t.habitTag}</Pill>}
                      {t.localCurrencyId ? (
                        <Pill tone="leaf">충전</Pill>
                      ) : (
                        t.source === "auto" && <Pill tone="stone">고정</Pill>
                      )}
                      <span>· {memberName(t.member)}</span>
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold tabular ${
                      t.type === "income" ? "text-sky" : "text-ink"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {won(t.amount)}
                  </span>
                </button>
              );
            })}
          </Card>
        ))
      )}

      {edit && (
        <TransactionForm
          open={!!edit}
          onClose={() => setEdit(null)}
          initial={edit ?? undefined}
        />
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-2.5 text-center">
      <p className="text-[11px] text-stone">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular ${tone}`}>{value}</p>
    </div>
  );
}
