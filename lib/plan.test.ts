import { describe, it, expect } from "vitest";
import { activeItems, computePlanPnl, groupTotal, remainingMonths } from "./plan";
import { SEED_PLAN_ITEMS } from "./seed";
import type { PlanItem } from "./types";

// 기준월 — 시드의 어떤 항목도 아직 끝나지 않은 달
const YM = "2026-08";

describe("computePlanPnl — 손글씨 계획 골든 케이스", () => {
  it("시드 27항목의 운영이익이 노트의 잔액 25,794와 일치한다", () => {
    const s = computePlanPnl(SEED_PLAN_ITEMS, YM);
    expect(s.operatingProfit).toBe(25794);
  });

  it("4버킷 합계가 골든 값과 일치한다", () => {
    const s = computePlanPnl(SEED_PLAN_ITEMS, YM);
    expect(s.revenue).toBe(4400000);
    expect(s.fixed).toBe(2299206);
    expect(s.saving).toBe(775000);
    expect(s.variable).toBe(1300000);
    expect(s.grossProfit).toBe(4400000 - 2299206 - 775000);
    expect(s.bepAchieved).toBe(true);
  });

  it("빈 계획이면 전 필드 0이고 operatingMargin은 0이다 (0으로 나누기 가드)", () => {
    const s = computePlanPnl([], YM);
    expect(s.revenue).toBe(0);
    expect(s.operatingProfit).toBe(0);
    expect(s.operatingMargin).toBe(0);
  });
});

describe("groupTotal — 노트의 구획별 소계", () => {
  it("월 지출 = 2,760,000", () => {
    expect(groupTotal(SEED_PLAN_ITEMS, "spending")).toBe(2760000);
  });

  it("저축·상환(⊖ 제외) = 1,254,206", () => {
    expect(groupTotal(SEED_PLAN_ITEMS, "saving", false)).toBe(1254206);
  });

  it("여유 시 집행(⊖만) = 360,000", () => {
    expect(groupTotal(SEED_PLAN_ITEMS, "saving", true)).toBe(360000);
  });

  it("수입 = 4,400,000", () => {
    expect(groupTotal(SEED_PLAN_ITEMS, "income")).toBe(4400000);
  });
});

describe("activeItems — 종료된 항목 제외", () => {
  it("endYearMonth가 기준월보다 이전이면 제외한다", () => {
    // 자동차 할부는 2027-03까지 → 2027-04에는 빠진다
    const ids = activeItems(SEED_PLAN_ITEMS, "2027-04").map((i) => i.id);
    expect(ids).not.toContain("plan-sav-car-loan");
  });

  it("endYearMonth가 기준월과 같으면 포함한다 (그 달까지 납부)", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2027-03").map((i) => i.id);
    expect(ids).toContain("plan-sav-car-loan");
  });

  it("endYearMonth가 null이면 항상 포함한다", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2099-12").map((i) => i.id);
    expect(ids).toContain("plan-exp-rent");
  });

  it("computePlanPnl은 종료된 항목을 빼고 집계한다", () => {
    const s = computePlanPnl(SEED_PLAN_ITEMS, "2027-04");
    // 자동차 할부 353,206이 고정비에서 빠진다
    expect(s.fixed).toBe(2299206 - 353206);
  });
});

describe("remainingMonths", () => {
  it("2026-08 기준 2027-03까지는 8회 남는다", () => {
    expect(remainingMonths("2027-03", "2026-08")).toBe(8);
  });

  it("2026-08 기준 2028-12까지는 29회 남는다", () => {
    expect(remainingMonths("2028-12", "2026-08")).toBe(29);
  });

  it("당월이 마지막이면 1회 남는다", () => {
    expect(remainingMonths("2026-08", "2026-08")).toBe(1);
  });

  it("이미 지났으면 0이다", () => {
    expect(remainingMonths("2026-07", "2026-08")).toBe(0);
  });

  it("무기한(null)이면 null이다", () => {
    expect(remainingMonths(null, "2026-08")).toBe(null);
  });
});

describe("conditional 항목도 손익 집계에는 포함된다", () => {
  it("⊖ 항목을 빼면 운영이익이 360,000 늘어난다", () => {
    const withoutCond: PlanItem[] = SEED_PLAN_ITEMS.filter((i) => !i.conditional);
    const s = computePlanPnl(withoutCond, YM);
    expect(s.operatingProfit).toBe(25794 + 360000);
  });
});
