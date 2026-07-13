// 월 예산 계획 — 순수 계산.
// 계획 항목을 실적 P&L과 같은 4버킷(revenue/fixed/saving/variable)으로 집계해
// 같은 PnlSummary 타입을 반환한다. 그래야 폭포 차트와 대조표를 공유할 수 있다.
import type { PlanItem, PlanGroup, PnlSummary } from "./types";

// 기준월에 살아 있는 항목만. endYearMonth가 그 달이면 아직 포함한다(그 달까지 납부).
// "YYYY-MM" 문자열은 사전순 비교 = 시간순 비교라 그대로 비교한다.
export function activeItems(items: PlanItem[], yearMonth: string): PlanItem[] {
  return items.filter(
    (i) => i.endYearMonth == null || i.endYearMonth >= yearMonth
  );
}

export function computePlanPnl(items: PlanItem[], yearMonth: string): PnlSummary {
  let revenue = 0, fixed = 0, saving = 0, variable = 0;
  for (const i of activeItems(items, yearMonth)) {
    if (i.pnlClass === "revenue") revenue += i.amount;
    else if (i.pnlClass === "fixed") fixed += i.amount;
    else if (i.pnlClass === "saving") saving += i.amount;
    else variable += i.amount;
  }
  const grossProfit = revenue - fixed - saving;
  const operatingProfit = grossProfit - variable;
  return {
    revenue, fixed, saving, grossProfit, variable,
    operatingProfit,
    operatingMargin: revenue > 0 ? operatingProfit / revenue : 0,
    bepAchieved: operatingProfit >= 0,
    variableByHabit: {}, // 계획엔 습관 태그가 없다
  };
}

// 구획별 소계. conditional을 주면 ⊖ 여부로 한 번 더 거른다.
export function groupTotal(
  items: PlanItem[],
  group: PlanGroup,
  conditional?: boolean
): number {
  return items
    .filter((i) => i.group === group)
    .filter((i) => conditional === undefined || i.conditional === conditional)
    .reduce((sum, i) => sum + i.amount, 0);
}

// 기준월 포함 남은 개월 수. 무기한이면 null, 이미 지났으면 0.
export function remainingMonths(
  endYearMonth: string | null,
  yearMonth: string
): number | null {
  if (endYearMonth == null) return null;
  const [ey, em] = endYearMonth.split("-").map(Number);
  const [cy, cm] = yearMonth.split("-").map(Number);
  const n = (ey - cy) * 12 + (em - cm) + 1;
  return Math.max(n, 0);
}
