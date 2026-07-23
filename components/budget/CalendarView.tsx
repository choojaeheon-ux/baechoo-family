"use client";

import { useEffect, useState } from "react";
import { useData } from "@/lib/data-context";
import { dueItemsForMonth, type DueItem, installmentStatus } from "@/lib/recurring";
import { monthTransactions, noSpendInfo } from "@/lib/compute";
import {
  won,
  daysInMonth,
  todayISO,
  currentYearMonth,
  ddayLabel,
  dday,
  weekdayKo,
} from "@/lib/format";
import { Card, SectionTitle, Pill, Empty, ProgressBar } from "./ui";
import {
  memberName,
  type Member,
  type RewardRule,
  type Transaction,
} from "@/lib/types";
import { RewardRuleForm, TransactionForm } from "./forms";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarView({ ym }: { ym: string }) {
  const {
    recurring,
    transactions,
    categoryById,
    paymentMethodById,
    rewardRules,
    coupons,
    saveTransaction,
    removeTransaction,
    saveRecurring,
    saveCoupon,
  } = useData();

  const due = dueItemsForMonth(recurring, transactions, ym);
  const monthTxns = monthTransactions(transactions, ym);
  const dim = daysInMonth(ym);
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const today = todayISO();

  const [member, setMember] = useState<Member>("chuchu");
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editRule, setEditRule] = useState<RewardRule | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

  // 월이 바뀌면 선택 해제 (다른 달의 잘못된 날짜 표시 방지)
  useEffect(() => {
    setSelectedDay(null);
  }, [ym]);

  // 무지출 집계
  const noSpend = noSpendInfo(transactions, ym);
  const monthCoupons = coupons.filter((c) => c.earnedYearMonth === ym);

  // 달성 시 쿠폰 자동 발급 (이번 달, 규칙별 1회)
  useEffect(() => {
    if (ym !== currentYearMonth()) return;
    for (const rule of rewardRules) {
      // 결정적 ID로 중복 발급 방지 (StrictMode 이중 호출·동시성 안전)
      const couponId = `cpn-${rule.id}-${ym}`;
      if (
        noSpend.count >= rule.days &&
        !coupons.some((c) => c.id === couponId)
      ) {
        saveCoupon({
          id: couponId,
          ruleId: rule.id,
          name: rule.name,
          earnedYearMonth: ym,
          used: false,
        });
      }
    }
  }, [noSpend.count, rewardRules, coupons, ym, saveCoupon]);

  async function pay(d: DueItem) {
    await saveTransaction({
      id: "",
      date: d.dueDate,
      amount: d.recurring.amount,
      type: "expense",
      categoryId: d.recurring.categoryId,
      memo: d.recurring.name,
      member,
      paymentMethodId: d.recurring.paymentMethodId,
      isSpecial: false,
      habitTag: null,
      source: "auto",
      recurringId: d.recurring.id,
      localCurrencyId: null,
      isPaid: true,
      createdAt: "",
    });
    if (d.recurring.kind === "installment") {
      await saveRecurring({
        ...d.recurring,
        installmentPaidMonths: d.recurring.installmentPaidMonths + 1,
      });
    }
  }

  async function unpay(d: DueItem) {
    if (!d.paidTxn) return;
    await removeTransaction(d.paidTxn.id);
    if (d.recurring.kind === "installment") {
      await saveRecurring({
        ...d.recurring,
        installmentPaidMonths: Math.max(d.recurring.installmentPaidMonths - 1, 0),
      });
    }
  }

  // 이미 체크된 항목의 결제자만 교체 (체크 상태는 유지)
  async function togglePayer(d: DueItem) {
    if (!d.paidTxn) return;
    const next: Member = d.paidTxn.member === "chuchu" ? "baejji" : "chuchu";
    await saveTransaction({ ...d.paidTxn, member: next });
  }

  // 날짜별 마커
  const dueByDay = new Map<number, DueItem[]>();
  for (const d of due) {
    const day = Number(d.dueDate.slice(8));
    dueByDay.set(day, [...(dueByDay.get(day) ?? []), d]);
  }
  const txnDays = new Set(
    monthTxns.filter((t) => !t.isSpecial).map((t) => Number(t.date.slice(8)))
  );
  const specialDays = new Set(
    monthTxns.filter((t) => t.isSpecial).map((t) => Number(t.date.slice(8)))
  );

  // 날짜별 거래 목록 (선택한 날 상세 패널용)
  const txnsByDay = new Map<number, Transaction[]>();
  for (const t of monthTxns) {
    const day = Number(t.date.slice(8));
    txnsByDay.set(day, [...(txnsByDay.get(day) ?? []), t]);
  }
  const selectedTxns = selectedDay
    ? (txnsByDay.get(selectedDay) ?? []).sort(
        (a, b) => b.id.localeCompare(a.id)
      )
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
                  {specialDays.has(day) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]" />
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
          <Legend color="var(--color-gold)" label="특수지출" />
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
              {selIncome > 0 && (
                <span className="text-sky">+{won(selIncome)}</span>
              )}
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
              return (
                <button
                  key={t.id}
                  onClick={() => setEditTxn(t)}
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
            })
          )}
        </Card>
      )}

      {/* 무지출 챌린지 */}
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditRule(null);
              setRuleOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 보상 규칙
          </button>
        }
      >
        무지출 챌린지
      </SectionTitle>
      <Card>
        <div className="mb-3 flex items-center justify-around text-center">
          <div>
            <p className="text-3xl font-extrabold tabular text-leaf-dark">
              {noSpend.count}
              <span className="text-base font-bold text-stone">일</span>
            </p>
            <p className="text-[11px] text-stone">이번 달 무지출</p>
          </div>
          <div className="h-10 w-px bg-line" />
          <div>
            <p className="text-3xl font-extrabold tabular text-leaf">
              {noSpend.streak}
              <span className="text-base font-bold text-stone">일</span>
            </p>
            <p className="text-[11px] text-stone">연속 무지출🔥</p>
          </div>
        </div>

        {rewardRules.length === 0 ? (
          <Empty>
            &lsquo;+ 보상 규칙&rsquo;으로 목표를 만들어 보세요.
            <br />
            예: 무지출 5일 → 배달 1회권
          </Empty>
        ) : (
          <div className="space-y-3 border-t border-line pt-3">
            {[...rewardRules]
              .sort((a, b) => a.days - b.days)
              .map((rule) => {
                const achieved = noSpend.count >= rule.days;
                return (
                  <button
                    key={rule.id}
                    onClick={() => {
                      setEditRule(rule);
                      setRuleOpen(true);
                    }}
                    className="block w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        🎁 {rule.name}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          achieved ? "text-leaf-dark" : "text-stone"
                        }`}
                      >
                        {achieved ? "달성!" : `${noSpend.count}/${rule.days}일`}
                      </span>
                    </div>
                    <ProgressBar value={noSpend.count} max={rule.days} />
                  </button>
                );
              })}
          </div>
        )}
      </Card>

      {/* 쿠폰함 */}
      {monthCoupons.length > 0 && (
        <>
          <SectionTitle>쿠폰함</SectionTitle>
          <Card className="space-y-2">
            {monthCoupons.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-xl border border-dashed p-3 ${
                  c.used ? "border-line bg-cream opacity-60" : "border-leaf bg-leaf-light"
                }`}
              >
                <span className="text-2xl">🎟️</span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-bold ${
                      c.used ? "text-stone line-through" : "text-leaf-dark"
                    }`}
                  >
                    {c.name}
                  </p>
                  <p className="text-[11px] text-stone">무지출 챌린지 보상</p>
                </div>
                {c.used ? (
                  <button
                    onClick={() => saveCoupon({ ...c, used: false })}
                    className="text-xs text-stone"
                  >
                    되돌리기
                  </button>
                ) : (
                  <button
                    onClick={() => saveCoupon({ ...c, used: true })}
                    className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
                  >
                    사용
                  </button>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* 고정지출 투두 */}
      <SectionTitle
        right={
          <div className="flex items-center gap-1 text-[11px]">
            <span className="mr-1 font-semibold text-stone">결제자</span>
            {(["chuchu", "baejji"] as Member[]).map((mm) => (
              <button
                key={mm}
                onClick={() => setMember(mm)}
                className={`flex min-h-11 items-center rounded-full px-3 font-semibold ${
                  member === mm ? "bg-leaf text-white" : "bg-card border border-line text-stone"
                }`}
              >
                {memberName(mm)}
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
              <div
                key={d.recurring.id}
                className="flex w-full items-center gap-3 px-1 py-2"
              >
                <button
                  onClick={() => (paid ? unpay(d) : pay(d))}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left active:bg-cream"
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
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${paid ? "text-stone line-through" : "text-ink"}`}>
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
                </button>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular text-ink">{won(d.recurring.amount)}</p>
                  {paid && d.paidTxn ? (
                    <button
                      onClick={() => togglePayer(d)}
                      aria-label={`결제자 ${memberName(d.paidTxn.member)}, 눌러서 변경`}
                      className="mt-0.5 rounded-full bg-leaf-light px-2 py-0.5 text-[11px] font-semibold text-leaf-dark active:scale-95"
                    >
                      {memberName(d.paidTxn.member)}
                    </button>
                  ) : (
                    <Pill tone={left < 0 ? "coral" : left <= 3 ? "gold" : "stone"}>
                      {left < 0 ? "지남" : ddayLabel(d.dueDate)}
                    </Pill>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {ruleOpen && (
        <RewardRuleForm
          open={ruleOpen}
          onClose={() => setRuleOpen(false)}
          initial={editRule ?? undefined}
        />
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
