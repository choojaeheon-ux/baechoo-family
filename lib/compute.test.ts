import { describe, it, expect } from "vitest";
import { budgetForCategory, totalBudget } from "./compute";
import type { Budget } from "./types";

const b = (yearMonth: string | null, categoryId: string | null, amount: number): Budget =>
  ({ id: `${yearMonth}-${categoryId}`, yearMonth, categoryId, amount });

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
