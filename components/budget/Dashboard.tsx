"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  monthTransactions,
  sumBy,
  totalBudget,
  monthRecurringTotal,
  upcomingThisWeek,
} from "@/lib/compute";
import { won, weekdayKo, ddayLabel, dday, todayISO } from "@/lib/format";
import { Card, ProgressBar, SectionTitle, Pill, Empty } from "./ui";
import { LocalCurrencyForm, AmountSheet } from "./forms";
import type { Tab } from "./BudgetApp";
import type { LocalCurrency } from "@/lib/types";

export default function Dashboard({
  ym,
  onGoto,
}: {
  ym: string;
  onGoto: (t: Tab) => void;
}) {
  const {
    transactions,
    budgets,
    recurring,
    goals,
    categoryById,
    localCurrencies,
    saveLocalCurrency,
    saveTransaction,
    categories,
  } = useData();

  const [lcOpen, setLcOpen] = useState(false);
  const [editLc, setEditLc] = useState<LocalCurrency | null>(null);
  const [chargeLc, setChargeLc] = useState<LocalCurrency | null>(null);
  const [useLc, setUseLc] = useState<LocalCurrency | null>(null);

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

      {/* 지역화폐 */}
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditLc(null);
              setLcOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 추가
          </button>
        }
      >
        지역화폐
      </SectionTitle>
      <Card className="space-y-2">
        {localCurrencies.length === 0 ? (
          <Empty>온누리·경기지역화폐 등을 등록하고 매월 충전·잔액을 관리하세요.</Empty>
        ) : (
          localCurrencies.map((lc) => (
            <div key={lc.id} className="rounded-xl bg-cream p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setEditLc(lc);
                    setLcOpen(true);
                  }}
                  className="text-left"
                >
                  <p className="text-sm font-bold text-ink">🎟️ {lc.name}</p>
                  <p className="text-[11px] text-stone">
                    매월 충전 {won(lc.monthlyCharge)}
                  </p>
                </button>
                <div className="text-right">
                  <p className="text-[11px] text-stone">잔액(이월 포함)</p>
                  <p className="text-lg font-extrabold tabular text-leaf-dark">
                    {won(lc.balance)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setChargeLc(lc)}
                  className="flex-1 rounded-lg bg-leaf py-1.5 text-xs font-semibold text-white active:scale-[0.98]"
                >
                  + 충전
                </button>
                <button
                  onClick={() => setUseLc(lc)}
                  className="flex-1 rounded-lg border border-line bg-card py-1.5 text-xs font-semibold text-stone active:scale-[0.98]"
                >
                  − 사용
                </button>
              </div>
            </div>
          ))
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
      {lcOpen && (
        <LocalCurrencyForm
          open={lcOpen}
          onClose={() => setLcOpen(false)}
          initial={editLc ?? undefined}
        />
      )}
      <AmountSheet
        key={`charge-${chargeLc?.id ?? "none"}`}
        open={!!chargeLc}
        onClose={() => setChargeLc(null)}
        title={`${chargeLc?.name ?? ""} 충전`}
        label="충전 금액"
        defaultAmount={chargeLc?.monthlyCharge ?? 0}
        onConfirm={(amt) => {
          if (!chargeLc) return;
          saveLocalCurrency({ ...chargeLc, balance: chargeLc.balance + amt });
          const fallbackCat = categories.find((c) => c.type === "expense");
          const categoryId = chargeLc.defaultCategoryId ?? fallbackCat?.id ?? "";
          saveTransaction({
            id: "",
            date: todayISO(),
            amount: amt,
            type: "expense",
            categoryId,
            memo: `${chargeLc.name} 충전`,
            member: "chuchu",
            paymentMethodId: chargeLc.defaultPaymentMethodId,
            isSpecial: false,
            habitTag: null,
            source: "auto",
            recurringId: null,
            localCurrencyId: chargeLc.id,
            isPaid: true,
          });
        }}
      />
      <AmountSheet
        key={`use-${useLc?.id ?? "none"}`}
        open={!!useLc}
        onClose={() => setUseLc(null)}
        title={`${useLc?.name ?? ""} 사용`}
        label="사용 금액"
        onConfirm={(amt) => {
          if (useLc)
            saveLocalCurrency({ ...useLc, balance: Math.max(useLc.balance - amt, 0) });
        }}
      />
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
