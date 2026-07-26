import { UNGROUPED, type Budget, type Category, type RecurringExpense, type Transaction } from "./types";
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

export function budgetForCategory(
  budgets: Budget[],
  ym: string,
  categoryId: string | null
): number | null {
  const override = budgets.find(
    (x) => x.yearMonth === ym && x.categoryId === categoryId
  );
  if (override) return override.amount;
  const base = budgets.find(
    (x) => x.yearMonth === null && x.categoryId === categoryId
  );
  return base ? base.amount : null;
}

// 전체 월예산: categoryId=null 예산이 있으면 그것, 없으면 카테고리 예산 합
export function totalBudget(budgets: Budget[], ym: string): number {
  const overall = budgetForCategory(budgets, ym, null); // 전체 예산(카테고리 null)
  if (overall !== null) return overall;
  const catIds = new Set(
    budgets.filter((x) => x.categoryId !== null).map((x) => x.categoryId!)
  );
  let sum = 0;
  for (const id of catIds) {
    const v = budgetForCategory(budgets, ym, id);
    if (v !== null) sum += v;
  }
  return sum;
}

/* ───────────── 예산 소진률 (계정 과목 기준) ───────────── */

// 계정과목별 예산의 총합 — 전체 예산 소진률의 분모.
// 지출 계정과목에 걸린 예산만 더한다(전체 월예산 행은 세지 않는다).
export function categoryBudgetTotal(
  budgets: Budget[],
  categories: Category[],
  ym: string
): number {
  let sum = 0;
  for (const c of categories) {
    if (c.type !== "expense") continue;
    const v = budgetForCategory(budgets, ym, c.id);
    if (v !== null) sum += v;
  }
  return sum;
}

export interface BurnRow {
  category: Category;
  budget: number; // 그 달에 적용되는 예산
  spend: number;
  pct: number; // 소진률 %
}

export interface BurnSummary {
  rows: BurnRow[]; // 예산이 잡힌 계정과목 (소진률 높은 순)
  unbudgeted: { category: Category; spend: number }[]; // 예산 없이 지출만 있는 계정과목 (금액 큰 순)
  budget: number; // 예산 총합
  spend: number; // 예산이 잡힌 과목의 지출 합
  pct: number; // 전체 소진률 %
}

// 상위 카테고리(그룹) 묶음 — 카테고리 자체에는 예산을 책정하지 않는다.
// budget/spend는 화면 표시가 아니라 그룹 정렬용 합계다.
export interface BurnGroup {
  name: string; // 그룹명 (없으면 "미분류")
  rows: BurnRow[];
  budget: number;
  spend: number;
}

// 계정과목 행들을 상위 카테고리로 묶는다.
// 그룹 순서 = 하위 예산 합 큰 순, "미분류"는 항상 맨 뒤. 그룹 안은 소진률 높은 순.
export function groupBurnRows(rows: BurnRow[]): BurnGroup[] {
  const map = new Map<string, BurnRow[]>();
  for (const r of rows) {
    const key = r.category.groupName || UNGROUPED;
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  const groups: BurnGroup[] = [...map.entries()].map(([name, gRows]) => ({
    name,
    rows: [...gRows].sort((a, b) => b.pct - a.pct || b.budget - a.budget),
    budget: gRows.reduce((s, r) => s + r.budget, 0),
    spend: gRows.reduce((s, r) => s + r.spend, 0),
  }));
  return groups.sort((a, b) => {
    if (a.name === UNGROUPED) return 1;
    if (b.name === UNGROUPED) return -1;
    return b.budget - a.budget || a.name.localeCompare(b.name);
  });
}

// 계정과목별 예산 소진률 + 전체 소진률
export function budgetBurndown(
  budgets: Budget[],
  categories: Category[],
  txns: Transaction[],
  ym: string
): BurnSummary {
  const spendMap = spendByCategory(monthTransactions(txns, ym));
  const rows: BurnRow[] = [];
  const unbudgeted: { category: Category; spend: number }[] = [];

  for (const category of categories) {
    if (category.type !== "expense") continue;
    const budget = budgetForCategory(budgets, ym, category.id);
    const spend = spendMap.get(category.id) ?? 0;
    if (budget !== null) {
      rows.push({
        category,
        budget,
        spend,
        pct: budget > 0 ? (spend / budget) * 100 : 0,
      });
    } else if (spend > 0) {
      unbudgeted.push({ category, spend });
    }
  }

  rows.sort((a, b) => b.pct - a.pct || b.budget - a.budget);
  unbudgeted.sort((a, b) => b.spend - a.spend);

  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  return {
    rows,
    unbudgeted,
    budget,
    spend,
    pct: budget > 0 ? (spend / budget) * 100 : 0,
  };
}

// 그 달의 시간 진행률(%) — 현재 월만 숫자, 과거·미래 월은 null(점선 표시 안 함)
export function monthTimeProgress(ym: string, today = todayISO()): number | null {
  if (ym !== yearMonthOf(today)) return null;
  return (Number(today.slice(8)) / daysInMonth(ym)) * 100;
}

// 이번 달 지출을 계정 과목의 성격(고정비/변동비/저축/손익 제외)별로 쪼갠 합계.
// 성격을 지정하지 않은 과목은 unset으로 따로 모은다.
export function costTypeSplit(
  txns: Transaction[],
  categories: Category[],
  ym: string
): {
  fixed: number;
  variable: number;
  saving: number;
  excluded: number;
  unset: number;
  total: number; // 손익 제외를 뺀 지출 합 (비율의 분모)
} {
  const out = { fixed: 0, variable: 0, saving: 0, excluded: 0, unset: 0, total: 0 };
  for (const t of monthTransactions(txns, ym)) {
    if (t.type !== "expense") continue;
    const ct = categories.find((c) => c.id === t.categoryId)?.costType ?? null;
    if (ct) out[ct] += t.amount;
    else out.unset += t.amount;
  }
  out.total = out.fixed + out.variable + out.saving + out.unset;
  return out;
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
