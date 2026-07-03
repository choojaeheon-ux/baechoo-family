import { describe, it, expect } from "vitest";
import { classifyTx } from "./pnl";
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
