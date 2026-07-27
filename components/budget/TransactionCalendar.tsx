"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { dueItemsForMonth, type DueItem } from "@/lib/recurring";
import { monthTransactions, noSpendInfo } from "@/lib/compute";
import { won, daysInMonth, todayISO, weekdayKo } from "@/lib/format";
import { Card, Pill, Empty } from "./ui";
import { TX_TYPE_COLOR, type Transaction } from "@/lib/types";
import { TransactionForm } from "./forms";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 거래내역 탭의 캘린더 보기 — 달력 그리드 + 고른 날의 거래 목록.
// (고정지출 체크리스트는 고정지출 탭, 무지출 챌린지는 대시보드로 옮겼다)
// ⚠️ 호출부에서 key={ym}으로 마운트한다 — 달이 바뀌면 고른 날짜가 남으면 안 되기 때문.
export default function TransactionCalendar({ ym }: { ym: string }) {
  const {
    recurring,
    transactions,
    localCurrencies,
    categoryById,
    paymentMethodById,
  } = useData();

  const due = dueItemsForMonth(recurring, transactions, ym);
  const monthTxns = monthTransactions(transactions, ym);
  const dim = daysInMonth(ym);
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const today = todayISO();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

  const noSpend = noSpendInfo(transactions, ym);

  // 날짜별 마커
  const dueByDay = new Map<number, DueItem[]>();
  for (const d of due) {
    const day = Number(d.dueDate.slice(8));
    dueByDay.set(day, [...(dueByDay.get(day) ?? []), d]);
  }
  const txnDays = new Set(monthTxns.map((t) => Number(t.date.slice(8))));

  // 날짜별 거래 목록 (선택한 날 상세 패널용)
  const txnsByDay = new Map<number, Transaction[]>();
  for (const t of monthTxns) {
    const day = Number(t.date.slice(8));
    txnsByDay.set(day, [...(txnsByDay.get(day) ?? []), t]);
  }
  const selectedTxns = selectedDay
    ? (txnsByDay.get(selectedDay) ?? []).sort((a, b) => b.id.localeCompare(a.id))
    : [];
  const selectedIso = selectedDay
    ? `${ym}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selExpense = selectedTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const selIncome = selectedTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-2">
      {/* 달력 그리드 */}
      <Card>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-stone">
          {WEEK.map((w, i) => (
            <span
              key={w}
              className={i === 0 ? "text-coral" : i === 6 ? "text-sky" : ""}
            >
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (day === null) return <span key={`e${idx}`} />;
            const iso = `${ym}-${String(day).padStart(2, "0")}`;
            const items = dueByDay.get(day) ?? [];
            const hasUnpaid = items.some((it) => !it.paidTxn);
            const allPaid = items.length > 0 && !hasUnpaid;
            const isToday = iso === today;
            const isNoSpend = noSpend.noSpendDays.has(day);
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() =>
                  setSelectedDay((prev) => (prev === day ? null : day))
                }
                className="flex flex-col items-center"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "bg-leaf font-bold text-white"
                      : isNoSpend
                        ? "bg-leaf-light font-semibold text-leaf-dark"
                        : "text-ink"
                  } ${isSelected ? "ring-2 ring-leaf ring-offset-1" : ""}`}
                >
                  {day}
                </span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {items.length > 0 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: hasUnpaid
                          ? "var(--color-coral)"
                          : allPaid
                            ? "var(--color-leaf)"
                            : "var(--color-stone)",
                      }}
                    />
                  )}
                  {txnDays.has(day) && items.length === 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sky)]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center gap-3 border-t border-line pt-2 text-[10px] text-stone">
          <Legend color="var(--color-coral)" label="고정지출 예정" />
          <Legend color="var(--color-leaf)" label="납부완료" />
          <Legend color="var(--color-sky)" label="기타지출" />
          <Legend color="var(--color-leaf-light)" label="무지출" filled />
        </div>
      </Card>

      {/* 선택한 날 거래 내역 */}
      {selectedDay !== null && selectedIso && (
        <Card className="space-y-1">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-sm font-bold text-ink">
              {Number(selectedIso.slice(5, 7))}월 {selectedDay}일 (
              {weekdayKo(selectedIso)})
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold tabular">
              {selIncome > 0 && <span className="text-sky">+{won(selIncome)}</span>}
              {selExpense > 0 && (
                <span className="text-coral">-{won(selExpense)}</span>
              )}
              <button
                onClick={() => setSelectedDay(null)}
                className="text-stone"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>
          {selectedTxns.length === 0 ? (
            <Empty>이 날은 거래 내역이 없어요.</Empty>
          ) : (
            selectedTxns.map((t) => {
              const cat = categoryById(t.categoryId);
              const pm = t.paymentMethodId
                ? paymentMethodById(t.paymentMethodId)
                : undefined;
              const lc = t.localCurrencyId
                ? localCurrencies.find((l) => l.id === t.localCurrencyId)
                : undefined;
              return (
                <button
                  key={t.id}
                  onClick={() => setEditTxn(t)}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-cream"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: TX_TYPE_COLOR[t.type] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {t.merchant || t.memo || cat?.name || "내역"}
                    </p>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-stone">
                      <span>{cat?.name}</span>
                      {pm && <span>· {pm.name}</span>}
                      {lc && <Pill tone="leaf">🎟️ {lc.name}</Pill>}
                      {t.source === "auto" && <Pill tone="stone">고정</Pill>}
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
            })
          )}
        </Card>
      )}

      {editTxn && (
        <TransactionForm
          open={!!editTxn}
          onClose={() => setEditTxn(null)}
          initial={editTxn ?? undefined}
        />
      )}
    </div>
  );
}

function Legend({
  color,
  label,
  filled,
}: {
  color: string;
  label: string;
  filled?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      <span
        className={`h-2.5 w-2.5 ${filled ? "rounded" : "rounded-full"}`}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
