"use client";

import { useData } from "@/lib/data-context";
import {
  monthTransactions,
  sumBy,
  totalBudget,
  reducibleItems,
} from "@/lib/compute";
import { dueItemsForMonth, installmentStatus } from "@/lib/recurring";
import { won, ddayLabel, dday, weekdayKo } from "@/lib/format";
import { Card, ProgressBar, SectionTitle, Pill, Empty } from "./ui";

export default function Dashboard({
  ym,
  onGoto,
}: {
  ym: string;
  onGoto: (t: "home" | "calendar" | "list" | "analysis" | "plans") => void;
}) {
  const { transactions, budgets, recurring, goals, categories, categoryById } =
    useData();

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const income = sumBy(monthTxns, "income");
  const budget = totalBudget(budgets, ym);
  const remaining = budget - expense;

  const due = dueItemsForMonth(recurring, transactions, ym);
  const upcomingUnpaid = due
    .filter((d) => !d.paidTxn)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const installments = recurring
    .map((r) => ({ r, st: installmentStatus(r) }))
    .filter((x) => x.st && !x.st.done) as {
    r: (typeof recurring)[number];
    st: NonNullable<ReturnType<typeof installmentStatus>>;
  }[];

  const reducible = reducibleItems(transactions, budgets, categories, ym);

  return (
    <div className="space-y-1 pb-4">
      {/* 예산 대비 사용 */}
      <SectionTitle right={<Pill tone={remaining >= 0 ? "leaf" : "coral"}>{remaining >= 0 ? "여유" : "초과"}</Pill>}>
        이번 달 예산
      </SectionTitle>
      <Card>
        {budget > 0 ? (
          <>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-2xl font-extrabold tabular text-ink">
                {won(expense)}
              </span>
              <span className="text-sm text-stone">/ {won(budget)}</span>
            </div>
            <ProgressBar value={expense} max={budget} />
            <div className="mt-2 flex justify-between text-xs text-stone">
              <span>{Math.round((expense / budget) * 100)}% 사용</span>
              <span className={remaining >= 0 ? "text-leaf-dark" : "text-coral"}>
                {remaining >= 0 ? `${won(remaining)} 남음` : `${won(-remaining)} 초과`}
              </span>
            </div>
          </>
        ) : (
          <button
            onClick={() => onGoto("plans")}
            className="w-full py-3 text-sm text-stone"
          >
            아직 이번 달 예산이 없어요. <span className="font-semibold text-leaf">설정하기 →</span>
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <div>
            <p className="text-xs text-stone">수입</p>
            <p className="font-bold tabular text-sky">{won(income)}</p>
          </div>
          <div>
            <p className="text-xs text-stone">지출</p>
            <p className="font-bold tabular text-coral">{won(expense)}</p>
          </div>
        </div>
      </Card>

      {/* 다가오는 고정지출 */}
      <SectionTitle right={<button onClick={() => onGoto("calendar")} className="text-xs font-semibold text-leaf">캘린더 →</button>}>
        다가오는 고정지출
      </SectionTitle>
      <Card className="space-y-2">
        {upcomingUnpaid.length === 0 ? (
          <Empty>이번 달 미납 고정지출이 없어요 👍</Empty>
        ) : (
          upcomingUnpaid.slice(0, 5).map((d) => {
            const cat = categoryById(d.recurring.categoryId);
            const left = dday(d.dueDate);
            return (
              <div key={d.recurring.id} className="flex items-center gap-3">
                <span className="text-xl">{cat?.icon ?? "💸"}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{d.recurring.name}</p>
                  <p className="text-xs text-stone">
                    {Number(d.dueDate.slice(8))}일({weekdayKo(d.dueDate)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular text-ink">{won(d.recurring.amount)}</p>
                  <Pill tone={left < 0 ? "coral" : left <= 3 ? "gold" : "stone"}>
                    {left < 0 ? "지남" : ddayLabel(d.dueDate)}
                  </Pill>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* 할부 카운트다운 */}
      {installments.length > 0 && (
        <>
          <SectionTitle>할부 카운트다운</SectionTitle>
          <div className="grid grid-cols-1 gap-2">
            {installments.map(({ r, st }) => (
              <Card key={r.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">🧾 {r.name}</span>
                  <Pill tone="leaf">
                    {st.paid}/{st.total} 완료
                  </Pill>
                </div>
                <ProgressBar value={st.paid} max={st.total} />
                <div className="mt-2 flex justify-between text-xs text-stone">
                  <span>{st.remainingMonths}개월 남음</span>
                  <span className="font-semibold text-ink">남은 총액 {won(st.remainingAmount)}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 목표 달성률 */}
      {goals.length > 0 && (
        <>
          <SectionTitle right={<button onClick={() => onGoto("plans")} className="text-xs font-semibold text-leaf">관리 →</button>}>
            목표 달성률
          </SectionTitle>
          <div className="space-y-2">
            {goals.map((g) => {
              const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
              return (
                <Card key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">🎯 {g.name}</span>
                    <span className="text-sm font-bold tabular text-leaf-dark">
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <ProgressBar value={g.currentAmount} max={g.targetAmount} color="var(--color-gold)" />
                  <p className="mt-2 text-xs text-stone">
                    {won(g.currentAmount)} / {won(g.targetAmount)}
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* 줄일 수 있는 항목 미리보기 */}
      {reducible.length > 0 && (
        <>
          <SectionTitle right={<button onClick={() => onGoto("analysis")} className="text-xs font-semibold text-leaf">분석 →</button>}>
            줄일 수 있는 항목
          </SectionTitle>
          <Card className="space-y-2">
            {reducible.slice(0, 2).map((it) => (
              <div key={it.category.id} className="flex items-center gap-3">
                <span className="text-xl">{it.category.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{it.category.name}</p>
                  <p className="text-xs text-coral">{it.reason}</p>
                </div>
                <span className="text-sm font-bold tabular text-ink">{won(it.spend)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="h-2" />
      <p className="px-1 text-center text-[11px] text-stone">
        오늘도 배추가족 화이팅 🥬
      </p>
    </div>
  );
}
