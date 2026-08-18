import { describe, it, expect } from "vitest";
import {
  budgetForCategory,
  totalBudget,
  categoryBudgetTotal,
  budgetBurndown,
  groupBurnRows,
  groupBudgetsByCategory,
  monthTimeProgress,
  costTypeSplit,
  resolveVersion,
  budgetsOfMonth,
} from "./compute";
import type { Budget, BudgetVersion, Category, CostType, Transaction } from "./types";

const b = (yearMonth: string | null, categoryId: string | null, amount: number): Budget =>
  ({ id: `${yearMonth}-${categoryId}`, yearMonth, categoryId, amount, versionId: "bv-a", sortOrder: null });

// 이 파일 전체가 쓰는 단일 버전 — 버전 해석 자체는 resolveVersion·budgetsOfMonth describe에서 따로 검증한다
const V1: BudgetVersion[] = [
  { id: "bv-a", name: "v1", startMonth: "2026-01", memo: null, createdAt: "" },
];

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
    expect(budgetForCategory(budgets, V1, "2026-06", "cat-food")).toBe(300000);
    expect(budgetForCategory(budgets, V1, "2026-09", "cat-food")).toBe(300000);
  });
  it("예산이 없으면 null", () => {
    expect(budgetForCategory([], V1, "2026-06", "cat-food")).toBe(null);
  });
});

describe("budgetForCategory — 버전이 갈리면 달마다 다른 금액", () => {
  const versions: BudgetVersion[] = [
    { id: "bv-a", name: "v1", startMonth: "2026-06", memo: null, createdAt: "" },
    { id: "bv-b", name: "v2", startMonth: "2026-08", memo: null, createdAt: "" },
  ];
  const budgets: Budget[] = [
    { id: "b1", yearMonth: null, categoryId: "cat-x", amount: 12345, versionId: "bv-a", sortOrder: null },
    { id: "b2", yearMonth: null, categoryId: "cat-y", amount: 23456, versionId: "bv-a", sortOrder: null },
    { id: "b3", yearMonth: null, categoryId: "cat-x", amount: 34567, versionId: "bv-b", sortOrder: null },
  ];

  it("7월은 v1 금액", () => {
    expect(budgetForCategory(budgets, versions, "2026-07", "cat-x")).toBe(12345);
  });

  it("8월은 v2 금액 — 과거는 소급되지 않는다", () => {
    expect(budgetForCategory(budgets, versions, "2026-08", "cat-x")).toBe(34567);
    expect(budgetForCategory(budgets, versions, "2026-07", "cat-x")).toBe(12345);
  });

  it("v2에서 뺀 과목은 8월부터 예산 없음", () => {
    expect(budgetForCategory(budgets, versions, "2026-07", "cat-y")).toBe(23456);
    expect(budgetForCategory(budgets, versions, "2026-08", "cat-y")).toBe(null);
  });
});

describe("totalBudget", () => {
  it("전체 예산(categoryId=null) 기본값 우선", () => {
    const budgets = [b(null, null, 1000000), b(null, "cat-food", 300000)];
    expect(totalBudget(budgets, V1, "2026-06")).toBe(1000000);
  });
  it("전체 예산 없으면 카테고리별 예산 합", () => {
    const budgets = [b(null, "cat-food", 300000), b(null, "cat-living", 200000)];
    expect(totalBudget(budgets, V1, "2026-06")).toBe(500000);
  });
});

describe("categoryBudgetTotal", () => {
  const cats = [cat("cat-food"), cat("cat-living"), cat("cat-salary", "income")];

  it("지출 계정과목에 걸린 예산만 합산한다", () => {
    const budgets = [b(null, "cat-food", 700000), b(null, "cat-living", 150000)];
    expect(categoryBudgetTotal(budgets, V1, cats, "2026-07")).toBe(850000);
  });

  it("전체 월예산(categoryId=null) 행은 세지 않는다", () => {
    const budgets = [b(null, null, 9999999), b(null, "cat-food", 700000)];
    expect(categoryBudgetTotal(budgets, V1, cats, "2026-07")).toBe(700000);
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
    const r = budgetBurndown(budgets, V1, cats, txns, "2026-07");
    expect(r.rows.map((x) => x.category.id)).toEqual(["cat-etc", "cat-living", "cat-food"]);
    expect(r.rows[0].pct).toBe(Infinity);
    expect(r.rows[1].pct).toBe(150);
    expect(r.rows[2].pct).toBe(60);
  });

  it("예산 안 잡은 과목도 예산 0으로 집계된다", () => {
    const r = budgetBurndown(budgets, V1, cats, txns, "2026-07");
    const etc = r.rows.find((x) => x.category.id === "cat-etc")!;
    expect(etc.budget).toBe(0);
    expect(etc.spend).toBe(80000);
  });

  it("전체 소진률 = 예산 합 대비 지출 합 (예산 없는 지출도 분자에 포함)", () => {
    const r = budgetBurndown(budgets, V1, cats, txns, "2026-07");
    expect(r.budget).toBe(600000);
    expect(r.spend).toBe(530000); // 300,000 + 150,000 + 80,000
    expect(r.pct).toBeCloseTo((530000 / 600000) * 100, 6);
  });

  it("예산이 하나도 없으면 전체 소진률 0", () => {
    const r = budgetBurndown([], V1, cats, txns, "2026-07");
    expect(r.budget).toBe(0);
    expect(r.pct).toBe(0);
  });

  it("예산도 지출도 없는 과목은 행에서 빠진다", () => {
    // 그 달에 근거가 없는 과목은 대시보드에 자리를 차지하면 안 된다.
    const withIdle = [...cats, cat("cat-idle")];
    const r = budgetBurndown(budgets, V1, withIdle, txns, "2026-07");
    expect(r.rows.map((x) => x.category.id)).not.toContain("cat-idle");
  });

  it("0원 예산 행만 있고 지출이 없어도 뺀다", () => {
    const r = budgetBurndown([...budgets, b(null, "cat-zero", 0)], V1, [...cats, cat("cat-zero")], txns, "2026-07");
    expect(r.rows.map((x) => x.category.id)).not.toContain("cat-zero");
  });

  it("지출만 있으면 남는다 — 예산 0이어도 초과로 보여야 한다", () => {
    const r = budgetBurndown(budgets, V1, cats, txns, "2026-07");
    expect(r.rows.map((x) => x.category.id)).toContain("cat-etc");
  });

  it("예산만 있고 지출이 없어도 남는다", () => {
    const r = budgetBurndown(budgets, V1, cats, [], "2026-07");
    expect(r.rows.map((x) => x.category.id)).toEqual(
      expect.arrayContaining(["cat-food", "cat-living"])
    );
  });
});

describe("groupBurnRows", () => {
  // 수도광열비(전기·가스·수도) / 인건비(급여) / 그룹 없는 과목 1개
  const cats = [
    cat("elec", "expense", "fixed", "수도광열비"),
    cat("gas", "expense", "fixed", "수도광열비"),
    cat("water", "expense", "fixed", "수도광열비"),
    cat("pay", "expense", "fixed", "인건비"),
    cat("etc", "expense", "variable", null),
  ];
  const budgets = [
    b(null, "elec", 150000),
    b(null, "gas", 100000),
    b(null, "water", 50000),
    b(null, "pay", 900000),
    b(null, "etc", 30000),
  ];
  const txns = [
    tx("t1", "2026-07-01", "elec", 157300),
    tx("t2", "2026-07-02", "gas", 98800),
    tx("t3", "2026-07-03", "water", 81100),
    tx("t4", "2026-07-04", "pay", 800000),
    tx("t5", "2026-07-05", "etc", 3000),
  ];
  const groups = () =>
    groupBurnRows(budgetBurndown(budgets, V1, cats, txns, "2026-07").rows);

  it("그룹 순서는 하위 예산 합 큰 순, 미분류는 맨 뒤", () => {
    expect(groups().map((g) => g.name)).toEqual(["인건비", "수도광열비", "미분류"]);
  });

  it("그룹 안은 소진률 높은 순", () => {
    const g = groups().find((x) => x.name === "수도광열비")!;
    expect(g.rows.map((r) => r.category.id)).toEqual(["water", "elec", "gas"]);
  });

  it("그룹 합계는 하위 과목의 합 (예산 책정이 아니라 정렬·참고용)", () => {
    const g = groups().find((x) => x.name === "수도광열비")!;
    expect(g.budget).toBe(300000);
    expect(g.spend).toBe(337200);
  });

  it("그룹 없는 과목은 '미분류'로 묶인다", () => {
    const g = groups().at(-1)!;
    expect(g.name).toBe("미분류");
    expect(g.rows.map((r) => r.category.id)).toEqual(["etc"]);
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

describe("resolveVersion — 그 달에 적용되는 예산 버전", () => {
  const v = (id: string, startMonth: string, createdAt = ""): BudgetVersion => ({
    id,
    name: id,
    startMonth,
    memo: null,
    createdAt,
  });
  const versions = [v("bv-b", "2026-08"), v("bv-a", "2026-06"), v("bv-c", "2026-11")];

  it("시작월과 조회월이 같으면 그 버전", () => {
    expect(resolveVersion(versions, "2026-08")?.id).toBe("bv-b");
  });

  it("두 버전 사이의 달은 앞 버전", () => {
    expect(resolveVersion(versions, "2026-09")?.id).toBe("bv-b");
    expect(resolveVersion(versions, "2026-07")?.id).toBe("bv-a");
  });

  it("마지막 버전 이후는 계속 그 버전", () => {
    expect(resolveVersion(versions, "2027-03")?.id).toBe("bv-c");
  });

  it("가장 이른 시작월보다 앞선 달은 가장 이른 버전으로 폴백", () => {
    expect(resolveVersion(versions, "2026-01")?.id).toBe("bv-a");
  });

  it("버전이 없으면 null", () => {
    expect(resolveVersion([], "2026-08")).toBe(null);
  });

  it("시작월이 같으면 나중에 만든 버전", () => {
    const dup = [
      v("bv-old", "2026-08", "2026-08-01T00:00:00Z"),
      v("bv-new", "2026-08", "2026-08-02T00:00:00Z"),
    ];
    expect(resolveVersion(dup, "2026-08")?.id).toBe("bv-new");
  });
});

describe("budgetsOfMonth — 그 달 버전의 예산 행만", () => {
  const v = (id: string, startMonth: string): BudgetVersion => ({
    id,
    name: id,
    startMonth,
    memo: null,
    createdAt: "",
  });
  const versions = [v("bv-a", "2026-06"), v("bv-b", "2026-08")];
  const budgets: Budget[] = [
    { id: "b1", yearMonth: null, categoryId: "cat-x", amount: 12345, versionId: "bv-a", sortOrder: null },
    { id: "b2", yearMonth: null, categoryId: "cat-y", amount: 23456, versionId: "bv-a", sortOrder: null },
    { id: "b3", yearMonth: null, categoryId: "cat-x", amount: 34567, versionId: "bv-b", sortOrder: null },
  ];

  it("적용 버전의 행만 남는다", () => {
    const rows = budgetsOfMonth(budgets, versions, "2026-08");
    expect(rows.map((r) => r.id)).toEqual(["b3"]);
  });

  it("그 버전에 없는 과목은 다른 버전 행으로 대체되지 않는다", () => {
    // bv-b에는 cat-y 예산이 없다 → 8월 cat-y는 "예산 없음"이어야 한다.
    const rows = budgetsOfMonth(budgets, versions, "2026-08");
    expect(rows.find((r) => r.categoryId === "cat-y")).toBeUndefined();
  });

  it("버전이 없으면 빈 배열", () => {
    expect(budgetsOfMonth(budgets, [], "2026-08")).toEqual([]);
  });
});

describe("순서 지정 반영", () => {
  const V: BudgetVersion[] = [
    { id: "bv-o", name: "v", startMonth: "2026-01", memo: null, createdAt: "" },
  ];
  const cat = (id: string, name: string, groupName: string | null): Category => ({
    id,
    name,
    type: "expense",
    groupName,
    costType: "variable",
    color: "",
  });
  const cats = [
    cat("c-a", "가", "알파"),
    cat("c-b", "나", "알파"),
    cat("c-c", "다", "베타"),
    cat("c-d", "라", null), // 미분류
    cat("c-e", "마", "감마"), // 예산 행 없음
  ];
  const bud = (id: string, categoryId: string, amount: number, sortOrder: number | null): Budget => ({
    id,
    yearMonth: null,
    categoryId,
    amount,
    versionId: "bv-o",
    sortOrder,
  });
  // 베타(다)가 알파(가·나)보다 앞. 미분류(라)는 순서가 있어도 그룹은 맨 뒤.
  const budgets = [
    bud("b1", "c-c", 12345, 0),
    bud("b2", "c-a", 23456, 1),
    bud("b3", "c-b", 34567, 2),
    bud("b4", "c-d", 45678, 3),
  ];
  // c-e는 예산 행이 없으므로 지출이 있어야 행으로 남는다(예산 0·지출 0은 제외되는 규칙).
  const txns: Transaction[] = [tx("t-e", "2026-02-10", "c-e", 1000)];

  it("budgetBurndown이 예산 행의 sortOrder를 order로 싣는다", () => {
    const r = budgetBurndown(budgets, V, cats, txns, "2026-02");
    const byId = new Map(r.rows.map((x) => [x.category.id, x.order]));
    expect(byId.get("c-c")).toBe(0);
    expect(byId.get("c-a")).toBe(1);
  });

  it("예산 행이 없는 과목의 order는 null이다", () => {
    const r = budgetBurndown(budgets, V, cats, txns, "2026-02");
    expect(r.rows.find((x) => x.category.id === "c-e")!.order).toBe(null);
  });

  it("행 정렬 — 순서가 있는 것이 앞, 없는 것은 뒤", () => {
    const r = budgetBurndown(budgets, V, cats, txns, "2026-02");
    expect(r.rows.map((x) => x.category.id)).toEqual([
      "c-c",
      "c-a",
      "c-b",
      "c-d",
      "c-e",
    ]);
  });

  it("그룹 순서 — 소속 과목의 최소 order 순, 미분류는 맨 뒤", () => {
    const g = groupBurnRows(budgetBurndown(budgets, V, cats, txns, "2026-02").rows);
    expect(g.map((x) => x.name)).toEqual(["베타", "알파", "감마", "미분류"]);
  });

  it("그룹 안 과목도 order 순", () => {
    const g = groupBurnRows(budgetBurndown(budgets, V, cats, txns, "2026-02").rows);
    const alpha = g.find((x) => x.name === "알파")!;
    expect(alpha.rows.map((r) => r.category.id)).toEqual(["c-a", "c-b"]);
  });
});

describe("groupBudgetsByCategory — 예산 탭 목록 묶음", () => {
  const cats = new Map<string, Category>([
    ["c-a", { id: "c-a", name: "가", type: "expense", groupName: "알파", costType: "variable", color: "" }],
    ["c-b", { id: "c-b", name: "나", type: "expense", groupName: "알파", costType: "variable", color: "" }],
    ["c-c", { id: "c-c", name: "다", type: "expense", groupName: "베타", costType: "variable", color: "" }],
    ["c-d", { id: "c-d", name: "라", type: "expense", groupName: null, costType: "variable", color: "" }],
  ]);
  const byId = (id: string) => cats.get(id);
  const bud = (id: string, categoryId: string, sortOrder: number | null): Budget => ({
    id,
    yearMonth: null,
    categoryId,
    amount: 12345,
    versionId: "bv-o",
    sortOrder,
  });

  it("그룹은 최소 sortOrder 순, 미분류는 맨 뒤", () => {
    const g = groupBudgetsByCategory(
      [bud("b1", "c-a", 2), bud("b2", "c-c", 0), bud("b3", "c-b", 3), bud("b4", "c-d", 1)],
      byId
    );
    expect(g.map((x) => x.name)).toEqual(["베타", "알파", "미분류"]);
    expect(g[1].rows.map((r) => r.id)).toEqual(["b1", "b3"]);
  });

  it("sortOrder가 없는 행은 뒤로, 과목명 순", () => {
    const g = groupBudgetsByCategory(
      [bud("b1", "c-b", null), bud("b2", "c-a", null), bud("b3", "c-a", 0)],
      byId
    );
    expect(g[0].name).toBe("알파");
    expect(g[0].rows.map((r) => r.id)).toEqual(["b3", "b2", "b1"]);
  });

  it("빈 목록은 빈 배열", () => {
    expect(groupBudgetsByCategory([], byId)).toEqual([]);
  });
});
