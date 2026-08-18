import { describe, it, expect } from "vitest";
import { parseNames, joinNames } from "./mealNames";

describe("parseNames — 쉼표 조인 문자열 → 이름 배열", () => {
  it("빈 값은 빈 배열", () => {
    expect(parseNames("")).toEqual([]);
    expect(parseNames(null)).toEqual([]);
    expect(parseNames(undefined)).toEqual([]);
  });

  it("레거시 단일값은 항목 1개", () => {
    expect(parseNames("건사료")).toEqual(["건사료"]);
  });

  it("쉼표로 나누고 앞뒤 공백을 턴다", () => {
    expect(parseNames("건사료, 습식")).toEqual(["건사료", "습식"]);
    expect(parseNames("건사료,습식")).toEqual(["건사료", "습식"]);
    expect(parseNames("  건사료 ,  습식  ")).toEqual(["건사료", "습식"]);
  });

  it("빈 조각은 버린다", () => {
    expect(parseNames("건사료,,습식")).toEqual(["건사료", "습식"]);
    expect(parseNames(",건사료,")).toEqual(["건사료"]);
    expect(parseNames(", ,")).toEqual([]);
  });

  it("중복은 첫 등장만 남긴다", () => {
    expect(parseNames("건사료, 습식, 건사료")).toEqual(["건사료", "습식"]);
  });

  it("항목 이름 안의 공백은 보존한다", () => {
    expect(parseNames("오리 건사료, 연어 습식")).toEqual([
      "오리 건사료",
      "연어 습식",
    ]);
  });
});

describe("joinNames — 이름 배열 → 저장 문자열", () => {
  it("빈 배열은 빈 문자열", () => {
    expect(joinNames([])).toBe("");
  });

  it('", "로 잇는다', () => {
    expect(joinNames(["건사료", "습식"])).toBe("건사료, 습식");
  });

  it("공백·빈 값·중복을 정리한다", () => {
    expect(joinNames([" 건사료 ", "", "습식", "건사료"])).toBe("건사료, 습식");
    expect(joinNames(["", "  "])).toBe("");
  });
});

describe("왕복 불변식", () => {
  const cases = [
    "",
    "건사료",
    "건사료, 습식",
    "건사료, 습식, 닭가슴살",
    "오리 건사료, 연어 습식",
  ];

  it("정규화된 문자열은 왕복의 고정점", () => {
    for (const s of cases) expect(joinNames(parseNames(s))).toBe(s);
  });

  it("지저분한 입력도 한 번 왕복하면 고정점이 된다", () => {
    const messy = " 건사료 ,,  습식 , 건사료 ";
    const once = joinNames(parseNames(messy));
    expect(once).toBe("건사료, 습식");
    expect(joinNames(parseNames(once))).toBe(once);
  });

  it("배열 왕복도 보존된다", () => {
    const names = ["닭가슴살", "단호박"];
    expect(parseNames(joinNames(names))).toEqual(names);
  });
});
