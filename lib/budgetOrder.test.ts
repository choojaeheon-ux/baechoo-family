import { describe, it, expect } from "vitest";
import { moveSubject, moveGroup } from "./budgetOrder";
import type { Budget } from "./types";
import type { BudgetGroup } from "./compute";

const bud = (id: string, sortOrder: number | null): Budget => ({
  id,
  yearMonth: null,
  categoryId: "c-" + id,
  amount: 12345,
  versionId: "bv-o",
  sortOrder,
});

// 알파[a1, a2] · 베타[b1] · 감마[g1, g2]
const groups = (): BudgetGroup[] => [
  { name: "알파", rows: [bud("a1", 0), bud("a2", 1)] },
  { name: "베타", rows: [bud("b1", 2)] },
  { name: "감마", rows: [bud("g1", 3), bud("g2", 4)] },
];

const ids = (rows: Budget[]) => rows.map((r) => r.id);
const orders = (rows: Budget[]) => rows.map((r) => r.sortOrder);

describe("moveSubject — 카테고리 안에서 과목 이동", () => {
  it("아래로 한 칸", () => {
    const out = moveSubject(groups(), "알파", 0, 1);
    expect(ids(out)).toEqual(["a2", "a1", "b1", "g1", "g2"]);
    expect(orders(out)).toEqual([0, 1, 2, 3, 4]);
  });

  it("위로 한 칸", () => {
    const out = moveSubject(groups(), "감마", 1, -1);
    expect(ids(out)).toEqual(["a1", "a2", "b1", "g2", "g1"]);
  });

  it("카테고리 경계를 넘지 않는다 — 첫 행의 위로는 무동작", () => {
    const out = moveSubject(groups(), "감마", 0, -1);
    expect(ids(out)).toEqual(["a1", "a2", "b1", "g1", "g2"]);
  });

  it("마지막 행의 아래로도 무동작", () => {
    const out = moveSubject(groups(), "알파", 1, 1);
    expect(ids(out)).toEqual(["a1", "a2", "b1", "g1", "g2"]);
  });

  it("한 행짜리 카테고리는 움직이지 않는다", () => {
    const out = moveSubject(groups(), "베타", 0, 1);
    expect(ids(out)).toEqual(["a1", "a2", "b1", "g1", "g2"]);
  });
});

describe("moveGroup — 카테고리 블록 통째 이동", () => {
  it("아래로 한 칸 — 소속 과목이 함께 움직인다", () => {
    const out = moveGroup(groups(), 0, 1);
    expect(ids(out)).toEqual(["b1", "a1", "a2", "g1", "g2"]);
    expect(orders(out)).toEqual([0, 1, 2, 3, 4]);
  });

  it("위로 한 칸", () => {
    const out = moveGroup(groups(), 2, -1);
    expect(ids(out)).toEqual(["a1", "a2", "g1", "g2", "b1"]);
  });

  it("맨 위의 위로는 무동작", () => {
    const out = moveGroup(groups(), 0, -1);
    expect(ids(out)).toEqual(["a1", "a2", "b1", "g1", "g2"]);
  });

  it("맨 아래의 아래로도 무동작", () => {
    const out = moveGroup(groups(), 2, 1);
    expect(ids(out)).toEqual(["a1", "a2", "b1", "g1", "g2"]);
  });
});

describe("sortOrder 정상화", () => {
  it("값이 비어 있거나 중복돼도 한 번의 이동으로 0..n-1이 된다", () => {
    const messy: BudgetGroup[] = [
      { name: "알파", rows: [bud("a1", null), bud("a2", 7)] },
      { name: "베타", rows: [bud("b1", 7)] },
    ];
    const out = moveGroup(messy, 0, 1);
    expect(orders(out)).toEqual([0, 1, 2]);
  });
});
