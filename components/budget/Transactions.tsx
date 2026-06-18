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
  const [edit, setEdit] = useState<Transaction | null>(null);

  const monthTxns = useMemo(
    () =>
      monthTransactions(transactions, ym)
        .filter((t) => filter === "all" || t.type === filter)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [transactions, ym, filter]
  );

  const grouped = useMemo(() => {
    const g = new Map<string, Transaction[]>();
    for (const t of monthTxns) g.set(t.date, [...(g.get(t.date) ?? []), t]);
    return [...g.entries()];
  }, [monthTxns]);

  const expense = sumBy(monthTransactions(transactions, ym), "expense");
  const income = sumBy(monthTransactions(transactions, ym), "income");

  return (
    <div className="space-y-2 pb-4">
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryBox label="수입" value={won(income)} tone="text-sky" />
        <SummaryBox label="지출" value={won(expense)} tone="text-coral" />
        <SummaryBox label="합계" value={won(income - expense)} tone="text-ink" />
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
                      {t.source === "auto" && <Pill tone="stone">고정</Pill>}
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
