import { describe, it, expect } from "vitest";
import {
  budgetForCategory,
  totalBudget,
  categoryBudgetTotal,
  budgetBurndown,
  monthTimeProgress,
  costTypeSplit,
} from "./compute";
import type { Budget, Category, CostType, Transaction } from "./types";

const b = (yearMonth: string | null, categoryId: string | null, amount: number): Budget =>
  ({ id: `${yearMonth}-${categoryId}`, yearMonth, categoryId, amount });

const cat = (
  id: string,
  type: Category["type"] = "expense",
  costType: CostType | null = null,
  groupName: string | null = null
): Category => ({ id, name: id, type, groupName, costType, color: "#000" });

const tx = (
  id: string,
  date: string,
  categoryId: string,
  amount: number,
  type: Transaction["type"] = "expense"
): Transaction => ({
  id,
  date,
  amount,
  type,
  categoryId,
  merchant: null,
  memo: null,
  member: "chuchu",
  paymentMethodId: null,
  localCurrencyId: null,
  isSpecial: false,
  habitTag: null,
  source: "manual",
  recurringId: null,
  isPaid: true,
  createdAt: `${date}T00:00:00.000Z`,
});

describe("budgetForCategory", () => {
  it("기본 예산만 있으면 그 값(모든 달)", () => {
    const budgets = [b(null, "cat-food", 300000)];
    expect(budgetForCategory(budgets, "2026-06", "cat-food")).toBe(300000);
    expect(budgetForCategory(budgets, "2026-09", "cat-food")).toBe(300000);
  });
  it("그 달 오버라이드가 있으면 오버라이드 우선", () => {
    const budgets = [b(null, "cat-food", 300000), b("2026-06", "cat-food", 400000)];
    expect(budgetForCategory(budgets, "2026-06", "cat-food")).toBe(400000);
    expect(budgetForCategory(budgets, "2026-07", "cat-food")).toBe(300000);
  });
  it("기본도 오버라이드도 없으면 null", () => {
    expect(budgetForCategory([], "2026-06", "cat-food")).toBe(null);
  });
});

describe("totalBudget", () => {
  it("전체 예산(categoryId=null) 기본값 우선", () => {
    const budgets = [b(null, null, 1000000), b(null, "cat-food", 300000)];
    expect(totalBudget(budgets, "2026-06")).toBe(1000000);
  });
  it("전체 예산 없으면 카테고리별 적용값 합(오버라이드 반영)", () => {
    const budgets = [
      b(null, "cat-food", 300000),
      b(null, "cat-living", 200000),
      b("2026-06", "cat-food", 400000),
    ];
    expect(totalBudget(budgets, "2026-06")).toBe(600000); // 400000 + 200000
    expect(totalBudget(budgets, "2026-07")).toBe(500000); // 300000 + 200000
  });
});

describe("categoryBudgetTotal", () => {
  const cats = [cat("cat-food"), cat("cat-living"), cat("cat-salary", "income")];

  it("지출 계정과목에 걸린 예산만 합산한다", () => {
    const budgets = [b(null, "cat-food", 700000), b(null, "cat-living", 150000)];
    expect(categoryBudgetTotal(budgets, cats, "2026-07")).toBe(850000);
  });

  it("전체 월예산(categoryId=null) 행은 세지 않는다", () => {
    const budgets = [b(null, null, 9999999), b(null, "cat-food", 700000)];
    expect(categoryBudgetTotal(budgets, cats, "2026-07")).toBe(700000);
  });

  it("그 달 오버라이드가 있으면 오버라이드로 합산", () => {
    const budgets = [b(null, "cat-food", 700000), b("2026-07", "cat-food", 500000)];
    expect(categoryBudgetTotal(budgets, cats, "2026-07")).toBe(500000);
    expect(categoryBudgetTotal(budgets, cats, "2026-08")).toBe(700000);
  });
});

describe("budgetBurndown", () => {
  const cats = [cat("cat-food"), cat("cat-living"), cat("cat-etc"), cat("cat-salary", "income")];
  const budgets = [b(null, "cat-food", 500000), b(null, "cat-living", 100000)];
  const txns = [
    tx("t1", "2026-07-03", "cat-food", 300000),
    tx("t2", "2026-07-10", "cat-living", 150000), // 예산 초과
    tx("t3", "2026-07-11", "cat-etc", 80000), // 예산 미설정
    tx("t4", "2026-06-30", "cat-food", 999999), // 다른 달 — 제외
    tx("t5", "2026-07-05", "cat-salary", 3000000, "income"), // 수입 — 제외
  ];

  it("소진률 높은 순 — 예산 없이 쓴 과목(Infinity)이 맨 위", () => {
    const r = budgetBurndown(budgets, cats, txns, "2026-07");
    expect(r.rows.map((x) => x.category.id)).toEqual(["cat-etc", "cat-living", "cat-food"]);
    expect(r.rows[0].pct).toBe(Infinity);
    expect(r.rows[1].pct).toBe(150);
    expect(r.rows[2].pct).toBe(60);
  });

  it("예산 안 잡은 과목도 예산 0으로 집계된다", () => {
    const r = budgetBurndown(budgets, cats, txns, "2026-07");
    const etc = r.rows.find((x) => x.category.id === "cat-etc")!;
    expect(etc.budget).toBe(0);
    expect(etc.spend).toBe(80000);
  });

  it("전체 소진률 = 예산 합 대비 지출 합 (예산 없는 지출도 분자에 포함)", () => {
    const r = budgetBurndown(budgets, cats, txns, "2026-07");
    expect(r.budget).toBe(600000);
    expect(r.spend).toBe(530000); // 300,000 + 150,000 + 80,000
    expect(r.pct).toBeCloseTo((530000 / 600000) * 100, 6);
  });

  it("예산이 하나도 없으면 전체 소진률 0", () => {
    const r = budgetBurndown([], cats, txns, "2026-07");
    expect(r.budget).toBe(0);
    expect(r.pct).toBe(0);
  });
});

describe("monthTimeProgress", () => {
  it("현재 월은 경과일 비율", () => {
    // 2026-07-24 기준: 24/31
    expect(monthTimeProgress("2026-07", "2026-07-24")).toBeCloseTo((24 / 31) * 100, 6);
  });
  it("과거 월·미래 월은 null (점선 표시 안 함)", () => {
    expect(monthTimeProgress("2026-06", "2026-07-24")).toBe(null);
    expect(monthTimeProgress("2026-08", "2026-07-24")).toBe(null);
  });
});

describe("costTypeSplit", () => {
  const cats = [
    cat("cat-rent", "expense", "fixed"),
    cat("cat-food", "expense", "variable"),
    cat("cat-sav", "expense", "saving"),
    cat("cat-card", "expense", "excluded"),
    cat("cat-etc"), // 성격 미지정
    cat("cat-salary", "income"),
  ];
  const txns = [
    tx("t1", "2026-07-01", "cat-rent", 600000),
    tx("t2", "2026-07-02", "cat-food", 200000),
    tx("t3", "2026-07-03", "cat-sav", 300000),
    tx("t4", "2026-07-04", "cat-card", 900000),
    tx("t5", "2026-07-05", "cat-etc", 50000),
    tx("t6", "2026-07-06", "cat-salary", 3000000, "income"), // 수입 제외
    tx("t7", "2026-06-01", "cat-rent", 600000), // 다른 달 제외
  ];

  it("성격별로 이번 달 지출을 나눈다", () => {
    const s = costTypeSplit(txns, cats, "2026-07");
    expect(s.fixed).toBe(600000);
    expect(s.variable).toBe(200000);
    expect(s.saving).toBe(300000);
    expect(s.excluded).toBe(900000);
    expect(s.unset).toBe(50000);
  });

  it("total은 손익 제외를 빼고 계산한다(비율의 분모)", () => {
    expect(costTypeSplit(txns, cats, "2026-07").total).toBe(1150000);
  });
});
