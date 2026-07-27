import type {
  Budget,
  Transaction,
  Category,
  PnlClass,
  PnlSummary,
  WaterfallSegment,
} from "./types";
import { EXCLUDED_CAT_IDS, FIXED_CAT_IDS, SAVING_CAT_IDS } from "./types";
import { budgetBurndown } from "./compute";

// 손익 분류는 계정 과목에 지정한 성격(costType)을 그대로 따른다.
// 성격이 비어 있는 구버전 계정 과목만 옛 id 규칙으로 넘긴다.
export function classifyTx(
  tx: Transaction,
  category: Category | undefined,
): PnlClass {
  if (category?.type === "income") return "revenue";
  if (category?.costType) return category.costType;

  // ── 이하 폴백: costType이 없는 구버전 계정 과목
  if (EXCLUDED_CAT_IDS.includes(tx.categoryId)) return "excluded";
  if (tx.recurringId != null || FIXED_CAT_IDS.includes(tx.categoryId)) return "fixed";
  if (SAVING_CAT_IDS.includes(tx.categoryId)) return "saving";
  return "variable";
}

export function computePnl(
  txns: Transaction[],
  categoryById: (id: string) => Category | undefined,
): PnlSummary {
  let revenue = 0, fixed = 0, saving = 0, variable = 0;
  const variableByHabit: Record<string, number> = {};
  for (const t of txns) {
    const cls = classifyTx(t, categoryById(t.categoryId));
    if (cls === "revenue") revenue += t.amount;
    else if (cls === "fixed") fixed += t.amount;
    else if (cls === "saving") saving += t.amount;
    else if (cls === "variable") {
      variable += t.amount;
      const key = t.habitTag ?? "기타";
      variableByHabit[key] = (variableByHabit[key] ?? 0) + t.amount;
    }
    // excluded는 무시
  }
  const grossProfit = revenue - fixed - saving;
  const operatingProfit = grossProfit - variable;
  const operatingMargin = revenue > 0 ? operatingProfit / revenue : 0;
  return {
    revenue, fixed, saving, grossProfit, variable,
    operatingProfit, operatingMargin,
    bepAchieved: operatingProfit >= 0,
    variableByHabit,
  };
}

// ── 연간 P&L (월별 12칸 + 합계) ────────────────────────────────────────────
export interface YearMonthPnl {
  ym: string;
  summary: PnlSummary;
  budget: number; // 그 달에 적용되는 계정과목 예산 합
  spend: number; // 그 달 지출 (예산 안 잡은 과목까지)
  burnPct: number | null; // 소진률 %. 예산이 없으면 낼 수 없으므로 null
}

export interface YearPnl {
  months: YearMonthPnl[]; // 1~12월
  total: PnlSummary;
  budget: number;
  spend: number;
  burnPct: number | null;
}

// 여러 달의 손익을 한 덩어리로 합친다. 비율은 합계에서 다시 계산한다(평균의 평균 금지).
function sumPnl(list: PnlSummary[]): PnlSummary {
  const t = list.reduce(
    (a, s) => {
      a.revenue += s.revenue;
      a.fixed += s.fixed;
      a.saving += s.saving;
      a.variable += s.variable;
      for (const [k, v] of Object.entries(s.variableByHabit))
        a.variableByHabit[k] = (a.variableByHabit[k] ?? 0) + v;
      return a;
    },
    {
      revenue: 0,
      fixed: 0,
      saving: 0,
      variable: 0,
      variableByHabit: {} as Record<string, number>,
    }
  );
  const grossProfit = t.revenue - t.fixed - t.saving;
  const operatingProfit = grossProfit - t.variable;
  return {
    ...t,
    grossProfit,
    operatingProfit,
    operatingMargin: t.revenue > 0 ? operatingProfit / t.revenue : 0,
    bepAchieved: operatingProfit >= 0,
  };
}

function pct(spend: number, budget: number): number | null {
  return budget > 0 ? (spend / budget) * 100 : null;
}

export function computeYearPnl(
  txns: Transaction[],
  categoryById: (id: string) => Category | undefined,
  budgets: Budget[],
  categories: Category[],
  year: number
): YearPnl {
  const months: YearMonthPnl[] = Array.from({ length: 12 }, (_, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
    const summary = computePnl(
      txns.filter((t) => t.date.startsWith(ym)),
      categoryById
    );
    // 예산·소진률은 가계부 대시보드와 같은 계산을 써서 숫자가 어긋나지 않게 한다
    const burn = budgetBurndown(budgets, categories, txns, ym);
    return {
      ym,
      summary,
      budget: burn.budget,
      spend: burn.spend,
      burnPct: pct(burn.spend, burn.budget),
    };
  });

  const budget = months.reduce((s, m) => s + m.budget, 0);
  const spend = months.reduce((s, m) => s + m.spend, 0);
  return {
    months,
    total: sumPnl(months.map((m) => m.summary)),
    budget,
    spend,
    burnPct: pct(spend, budget),
  };
}

export function buildWaterfall(s: PnlSummary): WaterfallSegment[] {
  const afterFixed = s.revenue - s.fixed;
  const afterSaving = afterFixed - s.saving;
  const afterVariable = afterSaving - s.variable;
  return [
    { label: "매출", range: [0, s.revenue], value: s.revenue, kind: "revenue" },
    { label: "고정비", range: [afterFixed, s.revenue], value: s.fixed, kind: "deduct" },
    { label: "선저축", range: [afterSaving, afterFixed], value: s.saving, kind: "deduct" },
    { label: "변동비", range: [afterVariable, afterSaving], value: s.variable, kind: "deduct" },
    { label: "운영이익", range: [Math.min(0, afterVariable), Math.max(0, afterVariable)], value: s.operatingProfit, kind: "profit" },
  ];
}
