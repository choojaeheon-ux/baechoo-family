"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  dueItemsForMonth,
  type DueItem,
  installmentStatus,
} from "@/lib/recurring";
import { won, ddayLabel, dday } from "@/lib/format";
import { Card, SectionTitle, Pill, Empty } from "./ui";
import { memberName, type Member } from "@/lib/types";

// 고정지출 체크리스트 — 원래 캘린더 탭에 있던 블록을 고정지출 탭으로 옮겼다.
// 체크(탭)할 때만 source:"auto" 거래가 생긴다. 등록(고정지출 목록)과 출금 반영은 분리된 설계.
export default function RecurringChecklist({ ym }: { ym: string }) {
  const {
    recurring,
    transactions,
    saveTransaction,
    removeTransaction,
    saveRecurring,
  } = useData();
  const [member, setMember] = useState<Member>("chuchu");

  const due = dueItemsForMonth(recurring, transactions, ym);

  async function pay(d: DueItem) {
    await saveTransaction({
      id: "",
      date: d.dueDate,
      amount: d.recurring.amount,
      type: "expense",
      categoryId: d.recurring.categoryId,
      merchant: null,
      memo: d.recurring.name,
      member,
      paymentMethodId: d.recurring.paymentMethodId,
      localCurrencyId: null,
      isSpecial: false,
      habitTag: null,
      source: "auto",
      recurringId: d.recurring.id,
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
        installmentPaidMonths: Math.max(
          d.recurring.installmentPaidMonths - 1,
          0
        ),
      });
    }
  }

  // 이미 체크된 항목의 결제자만 교체 (체크 상태는 유지)
  async function togglePayer(d: DueItem) {
    if (!d.paidTxn) return;
    const next: Member = d.paidTxn.member === "chuchu" ? "baejji" : "chuchu";
    await saveTransaction({ ...d.paidTxn, member: next });
  }

  return (
    <>
      <SectionTitle
        right={
          <div className="flex items-center gap-1 text-[11px]">
            <span className="mr-1 font-semibold text-stone">결제자</span>
            {(["chuchu", "baejji"] as Member[]).map((mm) => (
              <button
                key={mm}
                onClick={() => setMember(mm)}
                className={`flex min-h-11 items-center rounded-full px-3 font-semibold ${
                  member === mm
                    ? "bg-leaf text-white"
                    : "bg-card border border-line text-stone"
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
            이번 달 출금 예정인 고정지출이 없어요.
            <br />
            아래에서 고정지출·구독·할부를 추가해 보세요.
          </Empty>
        ) : (
          due.map((d) => {
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
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: "var(--color-coral)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-semibold ${
                        paid ? "text-stone line-through" : "text-ink"
                      }`}
                    >
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
                  <p className="text-sm font-bold tabular text-ink">
                    {won(d.recurring.amount)}
                  </p>
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
    </>
  );
}
