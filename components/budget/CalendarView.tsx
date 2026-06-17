"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { dueItemsForMonth, type DueItem, installmentStatus } from "@/lib/recurring";
import { monthTransactions } from "@/lib/compute";
import { won, daysInMonth, todayISO, ddayLabel, dday } from "@/lib/format";
import { Card, SectionTitle, Pill, Empty } from "./ui";
import type { Member } from "@/lib/types";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarView({ ym }: { ym: string }) {
  const { recurring, transactions, categoryById, saveTransaction, removeTransaction, saveRecurring } =
    useData();

  const due = dueItemsForMonth(recurring, transactions, ym);
  const monthTxns = monthTransactions(transactions, ym);
  const dim = daysInMonth(ym);
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const today = todayISO();

  const [member, setMember] = useState<Member>("chuchu");

  async function pay(d: DueItem) {
    await saveTransaction({
      id: "",
      date: d.dueDate,
      amount: d.recurring.amount,
      type: "expense",
      categoryId: d.recurring.categoryId,
      memo: d.recurring.name,
      member,
      source: "auto",
      recurringId: d.recurring.id,
      isPaid: true,
    });
    if (d.recurring.isInstallment) {
      await saveRecurring({
        ...d.recurring,
        installmentPaidMonths: d.recurring.installmentPaidMonths + 1,
      });
    }
  }

  async function unpay(d: DueItem) {
    if (!d.paidTxn) return;
    await removeTransaction(d.paidTxn.id);
    if (d.recurring.isInstallment) {
      await saveRecurring({
        ...d.recurring,
        installmentPaidMonths: Math.max(d.recurring.installmentPaidMonths - 1, 0),
      });
    }
  }

  // 날짜별 마커
  const dueByDay = new Map<number, DueItem[]>();
  for (const d of due) {
    const day = Number(d.dueDate.slice(8));
    dueByDay.set(day, [...(dueByDay.get(day) ?? []), d]);
  }
  const txnDays = new Set(monthTxns.map((t) => Number(t.date.slice(8))));

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-1 pb-4">
      {/* 달력 그리드 */}
      <Card>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-stone">
          {WEEK.map((w, i) => (
            <span key={w} className={i === 0 ? "text-coral" : i === 6 ? "text-sky" : ""}>
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
            return (
              <div key={day} className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isToday ? "bg-leaf font-bold text-white" : "text-ink"
                  }`}
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
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center gap-3 border-t border-line pt-2 text-[10px] text-stone">
          <Legend color="var(--color-coral)" label="미납 고정지출" />
          <Legend color="var(--color-leaf)" label="납부완료" />
          <Legend color="var(--color-sky)" label="기타 지출" />
        </div>
      </Card>

      {/* 고정지출 투두 */}
      <SectionTitle
        right={
          <div className="flex gap-1 text-[11px]">
            {(["chuchu", "baejji"] as Member[]).map((mm) => (
              <button
                key={mm}
                onClick={() => setMember(mm)}
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  member === mm ? "bg-leaf text-white" : "bg-card border border-line text-stone"
                }`}
              >
                {mm === "chuchu" ? "추추" : "배찌"}
              </button>
            ))}
          </div>
        }
      >
        고정지출 체크리스트
      </SectionTitle>
      <Card className="space-y-1">
        {due.length === 0 ? (
          <Empty>
            등록된 고정지출이 없어요.
            <br />
            예산·목표 탭에서 적금·카드값·할부를 추가해 보세요.
          </Empty>
        ) : (
          due.map((d) => {
            const cat = categoryById(d.recurring.categoryId);
            const paid = !!d.paidTxn;
            const left = dday(d.dueDate);
            const inst = installmentStatus(d.recurring);
            return (
              <button
                key={d.recurring.id}
                onClick={() => (paid ? unpay(d) : pay(d))}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-cream"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    paid
                      ? "border-leaf bg-leaf text-white"
                      : "border-line text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="text-lg">{cat?.icon ?? "💸"}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${paid ? "text-stone line-through" : "text-ink"}`}>
                    {d.recurring.name}
                    {inst && (
                      <span className="ml-1 text-[11px] font-normal text-stone">
                        ({inst.paid}/{inst.total})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone">
                    {Number(d.dueDate.slice(8))}일 출금
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular text-ink">{won(d.recurring.amount)}</p>
                  {!paid && (
                    <Pill tone={left < 0 ? "coral" : left <= 3 ? "gold" : "stone"}>
                      {left < 0 ? "지남" : ddayLabel(d.dueDate)}
                    </Pill>
                  )}
                </div>
              </button>
            );
          })
        )}
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
