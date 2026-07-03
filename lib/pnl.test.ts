import { describe, it, expect } from "vitest";
import { classifyTx, computePnl, buildWaterfall } from "./pnl";
import type { Transaction, Category } from "./types";

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: "t1", date: "2026-06-01", amount: 1000, type: "expense",
    categoryId: "cat-food", memo: null, member: "chuchu",
    paymentMethodId: null, isSpecial: false, habitTag: null,
    source: "manual", recurringId: null, localCurrencyId: null, isPaid: true,
    ...over,
  };
}
const cat = (id: string, type: Category["type"]): Category =>
  ({ id, name: id, type, color: "#000" });

describe("classifyTx", () => {
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
