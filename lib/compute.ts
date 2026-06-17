import type { Budget, Category, RecurringExpense, Transaction } from "./types";
import {
  yearMonthOf,
  shiftMonth,
  todayISO,
  currentYearMonth,
  daysInMonth,
} from "./format";
import { dueItemsForMonth, type DueItem } from "./recurring";

export function monthTransactions(txns: Transaction[], ym: string): Transaction[] {
  return txns.filter((t) => yearMonthOf(t.date) === ym);
}

export function sumBy(txns: Transaction[], type: "income" | "expense"): number {
  return txns.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
}

// 카테고리별 지출 합계 (expense만)
export function spendByCategory(txns: Transaction[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense") continue;
    m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
  }
  return m;
}

// 전체 월예산: categoryId=null 예산이 있으면 그것, 없으면 카테고리 예산 합
export function totalBudget(budgets: Budget[], ym: string): number {
  const monthly = budgets.filter((b) => b.yearMonth === ym);
  const overall = monthly.find((b) => b.categoryId === null);
  if (overall) return overall.amount;
  return monthly.reduce((s, b) => s + b.amount, 0);
}

export function budgetForCategory(
  budgets: Budget[],
  ym: string,
  categoryId: string
): number | null {
  const b = budgets.find(
    (x) => x.yearMonth === ym && x.categoryId === categoryId
  );
  return b ? b.amount : null;
}

export interface ReducibleItem {
  category: Category;
  spend: number;
  budget: number | null;
  prevSpend: number;
  reason: string;
  overBy: number; // 예산 초과액 (없으면 0)
}

// 줄일 수 있는 항목: 예산 초과 or 전월 대비 20%+ 증가
export function reducibleItems(
  txns: Transaction[],
  budgets: Budget[],
  categories: Category[],
  ym: string
): ReducibleItem[] {
  const cur = spendByCategory(monthTransactions(txns, ym));
  const prevYm = shiftMonth(ym, -1);
  const prev = spendByCategory(monthTransactions(txns, prevYm));
  const items: ReducibleItem[] = [];

  for (const [catId, spend] of cur) {
    const category = categories.find((c) => c.id === catId);
    if (!category) continue;
    const budget = budgetForCategory(budgets, ym, catId);
    const prevSpend = prev.get(catId) ?? 0;
    const reasons: string[] = [];
    let overBy = 0;

    if (budget !== null && spend > budget) {
      overBy = spend - budget;
      reasons.push(`예산 초과 (+${Math.round((overBy / budget) * 100)}%)`);
    }
    const growth = prevSpend > 0 ? (spend - prevSpend) / prevSpend : 0;
    if (growth >= 0.2 && spend - prevSpend >= 30000) {
      reasons.push(`전월 대비 +${Math.round(growth * 100)}%`);
    }

    if (reasons.length > 0) {
      items.push({
        category,
        spend,
        budget,
        prevSpend,
        reason: reasons.join(" · "),
        overBy,
      });
    }
  }
  // 초과액·증가액 큰 순
  return items.sort(
    (a, b) => b.overBy + (b.spend - b.prevSpend) - (a.overBy + (a.spend - a.prevSpend))
  );
}

// 습관 태그별 횟수·금액 집계 (줄일 수 있는 항목)
export interface HabitStat {
  tag: string;
  count: number;
  total: number;
}
export function habitSummary(txns: Transaction[], ym: string): HabitStat[] {
  const m = new Map<string, HabitStat>();
  for (const t of monthTransactions(txns, ym)) {
    if (t.type !== "expense" || !t.habitTag) continue;
    const cur = m.get(t.habitTag) ?? { tag: t.habitTag, count: 0, total: 0 };
    cur.count += 1;
    cur.total += t.amount;
    m.set(t.habitTag, cur);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

// 이번 달 고정지출 예정 총액
export function monthRecurringTotal(
  recurring: RecurringExpense[],
  transactions: Transaction[],
  ym: string
): number {
  return dueItemsForMonth(recurring, transactions, ym).reduce(
    (s, d) => s + d.recurring.amount,
    0
  );
}

// 이번 주(오늘~+7일) 예정 지출 (미납 고정지출)
export function upcomingThisWeek(
  recurring: RecurringExpense[],
  transactions: Transaction[]
): DueItem[] {
  const today = todayISO();
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  const endISO = end.toISOString().slice(0, 10);
  const thisYm = currentYearMonth();
  const nextYm = shiftMonth(thisYm, 1);
  const items = [
    ...dueItemsForMonth(recurring, transactions, thisYm),
    ...dueItemsForMonth(recurring, transactions, nextYm),
  ];
  return items
    .filter((d) => !d.paidTxn && d.dueDate >= today && d.dueDate <= endISO)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// 무지출 챌린지: 그날 지출(expense)이 0원인 날 집계
export interface NoSpendInfo {
  noSpendDays: Set<number>; // 무지출 날짜(일)
  count: number; // 이번 달 누적 무지출 일수
  streak: number; // 오늘(또는 집계 마지막일)까지 연속 무지출 일수
  countedThrough: number; // 며칠까지 집계했는지 (현재월=오늘, 과거월=말일)
}

export function noSpendInfo(txns: Transaction[], ym: string): NoSpendInfo {
  const today = todayISO();
  const curYm = currentYearMonth();
  let countedThrough: number;
  if (ym > curYm) countedThrough = 0; // 미래월
  else if (ym === curYm) countedThrough = Number(today.slice(8)); // 오늘까지
  else countedThrough = daysInMonth(ym); // 과거월 전체

  const expenseDays = new Set(
    txns
      .filter((t) => t.type === "expense" && yearMonthOf(t.date) === ym)
      .map((t) => Number(t.date.slice(8)))
  );
  const noSpendDays = new Set<number>();
  for (let d = 1; d <= countedThrough; d++) {
    if (!expenseDays.has(d)) noSpendDays.add(d);
  }
  let streak = 0;
  for (let d = countedThrough; d >= 1; d--) {
    if (noSpendDays.has(d)) streak++;
    else break;
  }
  return { noSpendDays, count: noSpendDays.size, streak, countedThrough };
}

// 최근 N개월 지출 추이 (오래된→최신)
export function monthlyExpenseTrend(
  txns: Transaction[],
  ym: string,
  months: number
): { ym: string; expense: number }[] {
  const out: { ym: string; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = shiftMonth(ym, -i);
    out.push({ ym: m, expense: sumBy(monthTransactions(txns, m), "expense") });
  }
  return out;
}
