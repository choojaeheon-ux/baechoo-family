"use client";

import { useData } from "@/lib/data-context";
import {
  monthTransactions,
  sumBy,
  totalBudget,
  monthRecurringTotal,
  upcomingThisWeek,
} from "@/lib/compute";
import { won, weekdayKo, ddayLabel, dday } from "@/lib/format";
import { Card, ProgressBar, SectionTitle, Pill, Empty } from "./ui";
import type { Tab } from "./BudgetApp";

export default function Dashboard({
  ym,
  onGoto,
}: {
  ym: string;
  onGoto: (t: Tab) => void;
}) {
  const { transactions, budgets, recurring, goals, categoryById } = useData();

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const budget = totalBudget(budgets, ym);
  const remaining = budget - expense;

  const recurringTotal = monthRecurringTotal(recurring, transactions, ym);
  const upcoming = upcomingThisWeek(recurring, transactions);

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 5);

  return (
    <div className="space-y-1 pb-4">
      {/* 예산 요약 */}
      <SectionTitle
        right={
          <Pill tone={remaining >= 0 ? "leaf" : "coral"}>
            {remaining >= 0 ? "여유" : "초과"}
          </Pill>
        }
      >
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
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="예산" value={won(budget)} />
              <Stat label="현재 사용액" value={won(expense)} tone="text-coral" />
              <Stat
                label="남은 예산"
                value={won(remaining)}
                tone={remaining >= 0 ? "text-leaf-dark" : "text-coral"}
              />
            </div>
          </>
        ) : (
          <button
            onClick={() => onGoto("plans")}
            className="w-full py-3 text-sm text-stone"
          >
            아직 이번 달 예산이 없어요.{" "}
            <span className="font-semibold text-leaf">설정하기 →</span>
          </button>
        )}
      </Card>

      {/* 저축 목표 달성률 */}
      <SectionTitle
        right={
          <button
            onClick={() => onGoto("plans")}
            className="text-xs font-semibold text-leaf"
          >
            관리 →
          </button>
        }
      >
        저축 목표 달성률
      </SectionTitle>
      <Card className="space-y-3">
        {goals.length === 0 ? (
          <Empty>연간 목표를 세워 보세요 (예: 비상금 500만원)</Empty>
        ) : (
          goals.map((g) => {
            const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
            return (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">🎯 {g.name}</span>
                  <span className="text-sm font-bold tabular text-leaf-dark">
                    {Math.round(pct)}%
                  </span>
                </div>
                <ProgressBar
                  value={g.currentAmount}
                  max={g.targetAmount}
                  color="var(--color-gold)"
                />
                <p className="mt-1 text-xs text-stone">
                  {won(g.currentAmount)} / {won(g.targetAmount)}
                </p>
              </div>
            );
          })
        )}
      </Card>

      {/* 이번 달 고정지출 예정 금액 */}
      <SectionTitle
        right={
          <button
            onClick={() => onGoto("fixed")}
            className="text-xs font-semibold text-leaf"
          >
            관리 →
          </button>
        }
      >
        이번 달 고정지출 예정
      </SectionTitle>
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone">총 예정 금액</span>
          <span className="text-xl font-extrabold tabular text-ink">
            {won(recurringTotal)}
          </span>
        </div>
      </Card>

      {/* 이번 주 예정 지출 */}
      <SectionTitle
        right={
          <button
            onClick={() => onGoto("calendar")}
            className="text-xs font-semibold text-leaf"
          >
            캘린더 →
          </button>
        }
      >
        이번 주 예정 지출
      </SectionTitle>
      <Card className="space-y-2">
        {upcoming.length === 0 ? (
          <Empty>이번 주 예정된 고정지출이 없어요 👍</Empty>
        ) : (
          upcoming.map((d) => {
            const cat = categoryById(d.recurring.categoryId);
            const left = dday(d.dueDate);
            return (
              <div key={d.recurring.id} className="flex items-center gap-3">
                <span className="text-xl">{cat?.icon ?? "💸"}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{d.recurring.name}</p>
                  <p className="text-xs text-stone">
                    {Number(d.dueDate.slice(5, 7))}월 {Number(d.dueDate.slice(8))}일(
                    {weekdayKo(d.dueDate)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular text-ink">
                    {won(d.recurring.amount)}
                  </p>
                  <Pill tone={left <= 1 ? "coral" : left <= 3 ? "gold" : "stone"}>
                    {ddayLabel(d.dueDate)}
                  </Pill>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* 최근 결제 5건 */}
      <SectionTitle
        right={
          <button
            onClick={() => onGoto("list")}
            className="text-xs font-semibold text-leaf"
          >
            전체 →
          </button>
        }
      >
        최근 결제 5건
      </SectionTitle>
      <Card className="space-y-1">
        {recent.length === 0 ? (
          <Empty>아직 거래 내역이 없어요.</Empty>
        ) : (
          recent.map((t) => {
            const cat = categoryById(t.categoryId);
            return (
              <div key={t.id} className="flex items-center gap-3 py-1">
                <span className="text-lg">{cat?.icon ?? "•"}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {t.memo || cat?.name || "내역"}
                  </p>
                  <p className="text-xs text-stone">
                    {Number(t.date.slice(5, 7))}.{Number(t.date.slice(8))} · {cat?.name}
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
              </div>
            );
          })
        )}
      </Card>

      <div className="h-2" />
      <p className="px-1 text-center text-[11px] text-stone">
        오늘도 배추가족 화이팅 🥬
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl bg-cream py-2">
      <p className="text-[11px] text-stone">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular ${tone}`}>{value}</p>
    </div>
  );
}
