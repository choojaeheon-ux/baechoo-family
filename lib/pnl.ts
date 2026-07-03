import type { Transaction, Category, PnlClass, PnlSummary, WaterfallSegment } from "./types";
import { EXCLUDED_CAT_IDS, FIXED_CAT_IDS, SAVING_CAT_IDS } from "./types";

export function classifyTx(
  tx: Transaction,
  category: Category | undefined,
): PnlClass {
  if (EXCLUDED_CAT_IDS.includes(tx.categoryId)) return "excluded";
  if (category?.type === "income") return "revenue";
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

// 연 집계는 호출자가 그 해 거래만 넘겨 computePnl 재사용
export const computeYearPnl = computePnl;

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
