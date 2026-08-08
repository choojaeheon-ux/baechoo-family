import { describe, it, expect } from "vitest";
import { classifyTx, computePnl, buildWaterfall, computeYearPnl } from "./pnl";
import type { Budget, BudgetVersion, Transaction, Category } from "./types";

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: "t1", date: "2026-06-01", amount: 1000, type: "expense",
    categoryId: "cat-food", merchant: null, memo: null, member: "chuchu",
    paymentMethodId: null, localCurrencyId: null, isSpecial: false, habitTag: null,
    source: "manual", recurringId: null, isPaid: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}
const cat = (
  id: string,
  type: Category["type"],
  costType: Category["costType"] = null
): Category => ({ id, name: id, type, groupName: null, costType, color: "#000" });

describe("classifyTx — 계정 과목에 지정한 성격을 따른다", () => {
  it("고정비 지정 → fixed", () => {
    expect(classifyTx(tx({ categoryId: "acc-rent" }), cat("acc-rent", "expense", "fixed"))).toBe("fixed");
  });
  it("저축 지정 → saving", () => {
    expect(classifyTx(tx({ categoryId: "acc-sav" }), cat("acc-sav", "expense", "saving"))).toBe("saving");
  });
  it("손익 제외 지정 → excluded", () => {
    expect(classifyTx(tx({ categoryId: "acc-card" }), cat("acc-card", "expense", "excluded"))).toBe("excluded");
  });
  it("변동비 지정은 고정지출 연결보다 우선한다", () => {
    // 지정이 있으면 recurringId 폴백 규칙에 끌려가지 않는다
    expect(classifyTx(tx({ categoryId: "acc-food", recurringId: "r1" }), cat("acc-food", "expense", "variable"))).toBe("variable");
  });
  it("수입 계정 과목은 성격과 무관하게 revenue", () => {
    expect(classifyTx(tx({ type: "income", categoryId: "cat-salary" }), cat("cat-salary", "income"))).toBe("revenue");
  });
});

describe("classifyTx — 성격이 없는 구버전 계정 과목 폴백", () => {
  it("수입은 revenue", () => {
    expect(classifyTx(tx({ type: "income", categoryId: "cat-salary" }), cat("cat-salary", "income"))).toBe("revenue");
  });
  it("카드값은 excluded", () => {
    expect(classifyTx(tx({ categoryId: "cat-card" }), cat("cat-card", "expense"))).toBe("excluded");
  });
  it("고정지출 연결은 fixed", () => {
    expect(classifyTx(tx({ recurringId: "r1" }), cat("cat-food", "expense"))).toBe("fixed");
  });
  it("청약은 fixed", () => {
    expect(classifyTx(tx({ categoryId: "cat-housing" }), cat("cat-housing", "expense"))).toBe("fixed");
  });
  it("적금은 saving", () => {
    expect(classifyTx(tx({ categoryId: "cat-saving" }), cat("cat-saving", "expense"))).toBe("saving");
  });
  it("일반 지출은 variable", () => {
    expect(classifyTx(tx({ categoryId: "cat-food" }), cat("cat-food", "expense"))).toBe("variable");
  });
});

describe("computePnl", () => {
  const catById = (id: string): Category | undefined => {
    if (id === "cat-salary") return cat("cat-salary", "income");
    return cat(id, "expense");
  };
  const txns: Transaction[] = [
    tx({ id: "a", type: "income", categoryId: "cat-salary", amount: 5_000_000 }),
    tx({ id: "b", categoryId: "cat-housing", amount: 1_900_000 }),
    tx({ id: "c", categoryId: "cat-saving", amount: 1_000_000 }),
    tx({ id: "d", categoryId: "cat-food", amount: 1_200_000, habitTag: "외식" }),
    tx({ id: "e", categoryId: "cat-hobby", amount: 500_000 }),
    tx({ id: "f", categoryId: "cat-card", amount: 3_000_000 }), // 제외
  ];

  it("항목별 합계·운영이익·BEP", () => {
    const s = computePnl(txns, catById);
    expect(s.revenue).toBe(5_000_000);
    expect(s.fixed).toBe(1_900_000);
    expect(s.saving).toBe(1_000_000);
    expect(s.variable).toBe(1_700_000);
    expect(s.grossProfit).toBe(2_100_000);
    expect(s.operatingProfit).toBe(400_000);
    expect(s.bepAchieved).toBe(true);
    expect(s.variableByHabit["외식"]).toBe(1_200_000);
  });

  it("매출 0이면 운영이익률 0", () => {
    const s = computePnl([tx({ categoryId: "cat-food", amount: 100 })], catById);
    expect(s.revenue).toBe(0);
    expect(s.operatingMargin).toBe(0);
    expect(s.bepAchieved).toBe(false);
  });
});

describe("buildWaterfall", () => {
  it("매출→차감→운영이익 세그먼트 range", () => {
    const s = computePnl([
      tx({ id: "a", type: "income", categoryId: "cat-salary", amount: 5_000_000 }),
      tx({ id: "b", categoryId: "cat-housing", amount: 1_900_000 }),
      tx({ id: "c", categoryId: "cat-saving", amount: 1_000_000 }),
      tx({ id: "d", categoryId: "cat-food", amount: 1_700_000 }),
    ], (id) => id === "cat-salary" ? cat(id, "income") : cat(id, "expense"));
    const segs = buildWaterfall(s);
    expect(segs[0]).toMatchObject({ label: "매출", range: [0, 5_000_000], kind: "revenue" });
    expect(segs[1]).toMatchObject({ label: "고정비", range: [3_100_000, 5_000_000], kind: "deduct" });
    expect(segs[4]).toMatchObject({ label: "운영이익", range: [0, 400_000], kind: "profit" });
  });

  it("운영이익 적자(손실)면 변동비·운영이익 세그먼트가 음수 range", () => {
    const s = computePnl([
      tx({ id: "a", type: "income", categoryId: "cat-salary", amount: 3_000_000 }),
      tx({ id: "b", categoryId: "cat-housing", amount: 1_900_000 }),
      tx({ id: "c", categoryId: "cat-saving", amount: 1_000_000 }),
      tx({ id: "d", categoryId: "cat-food", amount: 700_000 }),
    ], (id) => id === "cat-salary" ? cat(id, "income") : cat(id, "expense"));
    expect(s.operatingProfit).toBe(-600_000);
    const segs = buildWaterfall(s);
    expect(segs[3]).toMatchObject({ label: "변동비", range: [-600_000, 100_000], kind: "deduct" });
    expect(segs[4]).toMatchObject({ label: "운영이익", range: [-600_000, 0], kind: "profit" });
  });
});

describe("computeYearPnl — 연간 P&L 표", () => {
  const cats: Category[] = [
    cat("acc-salary", "income"),
    cat("acc-rent", "expense", "fixed"),
    cat("acc-food", "expense", "variable"),
  ];
  const byId = (id: string) => cats.find((c) => c.id === id);
  // 단일 버전 — 버전 해석 자체는 compute.test.ts에서 따로 검증한다
  const versions: BudgetVersion[] = [
    { id: "bv-a", name: "v1", startMonth: "2026-01", memo: null, createdAt: "" },
  ];
  // 기본 예산(매달 적용) 식비 500,000
  const budgets: Budget[] = [
    { id: "b1", yearMonth: null, categoryId: "acc-food", amount: 500_000, versionId: "bv-a", sortOrder: null },
  ];

  const txns = [
    tx({ id: "1", date: "2026-01-10", type: "income", categoryId: "acc-salary", amount: 3_000_000 }),
    tx({ id: "2", date: "2026-01-15", categoryId: "acc-rent", amount: 1_000_000 }),
    tx({ id: "3", date: "2026-01-20", categoryId: "acc-food", amount: 400_000 }),
    tx({ id: "4", date: "2026-02-10", type: "income", categoryId: "acc-salary", amount: 2_000_000 }),
    tx({ id: "5", date: "2026-02-20", categoryId: "acc-food", amount: 600_000 }),
    // 다른 해는 섞이면 안 된다
    tx({ id: "6", date: "2025-01-10", type: "income", categoryId: "acc-salary", amount: 9_000_000 }),
  ];

  const y = computeYearPnl(txns, byId, budgets, versions, cats, 2026);

  it("12개월을 1월부터 만든다", () => {
    expect(y.months).toHaveLength(12);
    expect(y.months[0].ym).toBe("2026-01");
    expect(y.months[11].ym).toBe("2026-12");
  });

  it("월별 손익이 그 달 거래만 반영한다", () => {
    expect(y.months[0].summary.revenue).toBe(3_000_000);
    expect(y.months[0].summary.fixed).toBe(1_000_000);
    expect(y.months[0].summary.variable).toBe(400_000);
    expect(y.months[0].summary.operatingProfit).toBe(1_600_000);
  });

  it("거래가 없는 달은 전부 0", () => {
    expect(y.months[5].summary.revenue).toBe(0);
    expect(y.months[5].summary.operatingProfit).toBe(0);
  });

  it("합계는 12개월 누적, 운영이익률은 합계에서 다시 계산한다", () => {
    expect(y.total.revenue).toBe(5_000_000);
    expect(y.total.fixed).toBe(1_000_000);
    expect(y.total.variable).toBe(1_000_000);
    expect(y.total.operatingProfit).toBe(3_000_000);
    // 월별 이익률(53.3% / 70.0%)의 평균이 아니라 3,000,000 / 5,000,000
    expect(y.total.operatingMargin).toBeCloseTo(0.6, 10);
  });

  it("기본 예산은 매달 적용되고 소진률은 그 달 지출 기준", () => {
    expect(y.months[0].budget).toBe(500_000);
    expect(y.budget).toBe(6_000_000); // 500,000 × 12개월
    // 분자는 예산을 안 잡은 과목(월세)까지 포함한 지출 전체 — 대시보드 소진률과 같은 규칙.
    // 1월 = (1,000,000 + 400,000) / 500,000
    expect(y.months[0].spend).toBe(1_400_000);
    expect(y.months[0].burnPct).toBeCloseTo(280, 10);
    expect(y.months[1].burnPct).toBeCloseTo(120, 10);
  });

  it("예산이 없으면 소진률은 null (0%로 위장하지 않는다)", () => {
    const z = computeYearPnl(txns, byId, [], versions, cats, 2026);
    expect(z.months[0].burnPct).toBeNull();
    expect(z.burnPct).toBeNull();
  });

  it("다른 해 거래는 섞이지 않는다", () => {
    expect(y.total.revenue).not.toBe(14_000_000);
  });
});
