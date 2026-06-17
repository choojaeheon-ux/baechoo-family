import type { RecurringExpense, Transaction } from "./types";
import { resolveDueDate, yearMonthOf, daysInMonth } from "./format";

// 해당 월에 이 고정지출이 발생하는가?
export function recurringActiveInMonth(rec: RecurringExpense, ym: string): boolean {
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${String(daysInMonth(ym)).padStart(2, "0")}`;
  if (rec.startDate > monthEnd) return false;
  if (rec.endDate && rec.endDate < monthStart) return false;

  // 할부: 시작월부터 totalMonths 동안만 발생
  if (rec.kind === "installment" && rec.installmentTotalMonths) {
    const startYm = yearMonthOf(rec.startDate);
    const elapsed = monthsBetween(startYm, ym); // 0 = 시작월
    if (elapsed < 0 || elapsed >= rec.installmentTotalMonths) return false;
  }
  return true;
}

// startYm 기준 targetYm까지 경과 개월수 (같은 달이면 0)
export function monthsBetween(startYm: string, targetYm: string): number {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ty, tm] = targetYm.split("-").map(Number);
  return (ty - sy) * 12 + (tm - sm);
}

export interface DueItem {
  recurring: RecurringExpense;
  dueDate: string; // YYYY-MM-DD
  paidTxn: Transaction | null; // 이번 달 확정 거래
}

// 해당 월의 고정지출 출금 목록 (납부 여부 포함)
export function dueItemsForMonth(
  recurring: RecurringExpense[],
  transactions: Transaction[],
  ym: string
): DueItem[] {
  return recurring
    .filter((r) => recurringActiveInMonth(r, ym))
    .map((r) => {
      const dueDate = resolveDueDate(ym, r.dayOfMonth);
      const paidTxn =
        transactions.find(
          (t) => t.recurringId === r.id && yearMonthOf(t.date) === ym
        ) ?? null;
      return { recurring: r, dueDate, paidTxn };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export interface InstallmentStatus {
  paid: number;
  total: number;
  remainingMonths: number;
  remainingAmount: number;
  done: boolean;
}

export function installmentStatus(rec: RecurringExpense): InstallmentStatus | null {
  if (rec.kind !== "installment" || !rec.installmentTotalMonths) return null;
  const total = rec.installmentTotalMonths;
  const paid = Math.min(rec.installmentPaidMonths, total);
  const remainingMonths = Math.max(total - paid, 0);
  return {
    paid,
    total,
    remainingMonths,
    remainingAmount: remainingMonths * rec.amount,
    done: remainingMonths === 0,
  };
}
