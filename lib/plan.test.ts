import { describe, it, expect } from "vitest";
import {
  activeItems,
  computePlanPnl,
  groupTotal,
  remainingMonths,
  isOneTime,
  upcomingOneTime,
} from "./plan";
import { SEED_PLAN_ITEMS } from "./seed";
import type { PlanItem } from "./types";

// 기준선 달 — 1회성(2026-08 산후조리비)이 없고, 아직 아무 항목도 끝나지 않은 달
const YM = "2026-09";

describe("computePlanPnl — 손글씨 계획 골든 케이스", () => {
  it("기준선 달의 운영이익이 노트의 잔액 25,794와 일치한다", () => {
    expect(computePlanPnl(SEED_PLAN_ITEMS, YM).operatingProfit).toBe(25794);
  });

  it("앱 기본 화면(2026-07)도 기준선 25,794다", () => {
    expect(computePlanPnl(SEED_PLAN_ITEMS, "2026-07").operatingProfit).toBe(25794);
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

describe("1회성 지출 — 어머니 산후조리비 (2026-08)", () => {
  it("2026-08의 운영이익은 산후조리비 1,000,000만큼 떨어진다", () => {
    expect(computePlanPnl(SEED_PLAN_ITEMS, "2026-08").operatingProfit).toBe(-974206);
  });

  it("2026-08의 변동비에 산후조리비가 더해진다", () => {
    expect(computePlanPnl(SEED_PLAN_ITEMS, "2026-08").variable).toBe(1300000 + 1000000);
  });

  it("2026-08에는 살아 있다", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2026-08").map((i) => i.id);
    expect(ids).toContain("plan-once-postpartum");
  });

  it("그 전달(2026-07)·다음달(2026-09)에는 없다", () => {
    expect(
      activeItems(SEED_PLAN_ITEMS, "2026-07").map((i) => i.id)
    ).not.toContain("plan-once-postpartum");
    expect(
      activeItems(SEED_PLAN_ITEMS, "2026-09").map((i) => i.id)
    ).not.toContain("plan-once-postpartum");
  });
});

describe("isOneTime", () => {
  const base: PlanItem = {
    id: "x", group: "spending", name: "테스트", amount: 1000,
    pnlClass: "variable", conditional: false,
    startYearMonth: null, endYearMonth: null,
    targetTotal: null, note: null, sortOrder: 0,
  };

  it("시작월과 종료월이 같으면 1회성이다", () => {
    expect(isOneTime({ ...base, startYearMonth: "2026-08", endYearMonth: "2026-08" })).toBe(true);
  });

  it("시작월이 없으면 1회성이 아니다 (종료월만 있는 할부 등)", () => {
    expect(isOneTime({ ...base, startYearMonth: null, endYearMonth: "2027-03" })).toBe(false);
  });

  it("시작월과 종료월이 다르면 1회성이 아니다", () => {
    expect(isOneTime({ ...base, startYearMonth: "2026-08", endYearMonth: "2026-10" })).toBe(false);
  });

  it("둘 다 없으면 1회성이 아니다 (매달 항목)", () => {
    expect(isOneTime(base)).toBe(false);
  });
});

describe("upcomingOneTime — 다가오는 1회성 지출", () => {
  it("2026-07 기준으로 8월 산후조리비가 잡힌다", () => {
    const up = upcomingOneTime(SEED_PLAN_ITEMS, "2026-07");
    expect(up.map((i) => i.id)).toEqual(["plan-once-postpartum"]);
  });

  it("당월(2026-08)은 '다가오는'이 아니다 — 이미 이 달 계획에 들어 있다", () => {
    expect(upcomingOneTime(SEED_PLAN_ITEMS, "2026-08")).toEqual([]);
  });

  it("지나간 뒤(2026-09)에는 비어 있다", () => {
    expect(upcomingOneTime(SEED_PLAN_ITEMS, "2026-09")).toEqual([]);
  });

  it("여러 개면 월 오름차순으로 정렬한다", () => {
    const mk = (id: string, ym: string): PlanItem => ({
      id, group: "spending", name: id, amount: 1000,
      pnlClass: "variable", conditional: false,
      startYearMonth: ym, endYearMonth: ym,
      targetTotal: null, note: null, sortOrder: 0,
    });
    const items = [mk("c", "2026-12"), mk("a", "2026-09"), mk("b", "2026-10")];
    expect(upcomingOneTime(items, "2026-08").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("매달 항목은 잡히지 않는다", () => {
    const up = upcomingOneTime(SEED_PLAN_ITEMS, "2026-01");
    expect(up.map((i) => i.id)).not.toContain("plan-exp-rent");
  });
});

describe("activeItems — 시작·종료 경계", () => {
  it("endYearMonth가 기준월보다 이전이면 제외한다", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2027-04").map((i) => i.id);
    expect(ids).not.toContain("plan-sav-car-loan");
  });

  it("endYearMonth가 기준월과 같으면 포함한다 (그 달까지 납부)", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2027-03").map((i) => i.id);
    expect(ids).toContain("plan-sav-car-loan");
  });

  it("startYearMonth가 기준월보다 이후면 제외한다", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2026-07").map((i) => i.id);
    expect(ids).not.toContain("plan-once-postpartum");
  });

  it("startYearMonth가 null이면 아무리 과거여도 포함한다", () => {
    const ids = activeItems(SEED_PLAN_ITEMS, "2020-01").map((i) => i.id);
    expect(ids).toContain("plan-exp-rent");
  });

  it("computePlanPnl은 종료된 항목을 빼고 집계한다", () => {
    const s = computePlanPnl(SEED_PLAN_ITEMS, "2027-04");
    expect(s.fixed).toBe(2299206 - 353206);
  });
});

describe("groupTotal — 기준월 필터를 타지 않는다 (호출자가 걸러 넘긴다)", () => {
  it("월 지출 = 2,760,000 + 산후조리비 1,000,000 = 3,760,000", () => {
    // groupTotal에는 yearMonth 인자가 없다. Plan.tsx가 activeItems로 거른
    // 목록을 넘기므로 화면은 정상이다. 이 테스트는 그 계약을 못박아 둔다.
    expect(groupTotal(SEED_PLAN_ITEMS, "spending")).toBe(3760000);
  });

  it("기준월로 거른 목록을 넘기면 그 달의 소계가 나온다", () => {
    const jul = activeItems(SEED_PLAN_ITEMS, "2026-07");
    const aug = activeItems(SEED_PLAN_ITEMS, "2026-08");
    expect(groupTotal(jul, "spending")).toBe(2760000);
    expect(groupTotal(aug, "spending")).toBe(3760000);
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
    const withoutCond = SEED_PLAN_ITEMS.filter((i) => !i.conditional);
    expect(computePlanPnl(withoutCond, YM).operatingProfit).toBe(25794 + 360000);
  });
});
