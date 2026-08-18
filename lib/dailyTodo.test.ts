import { describe, it, expect } from "vitest";
import {
  achievedOn,
  activeOn,
  applyEdit,
  groupByCategory,
  isDoneOn,
  monthProgress,
  progressOn,
  streak,
  toggleDone,
} from "./dailyTodo";
import type { DailyTodo, DailyTodoCategory } from "./types";

function todo(over: Partial<DailyTodo> = {}): DailyTodo {
  return {
    id: "t1",
    title: "양치",
    categoryId: "c1",
    startDate: "2026-08-01",
    endDate: null,
    onceDate: null,
    doneDates: [],
    sortOrder: 10,
    createdAt: "2026-08-01",
    ...over,
  };
}

const cats: DailyTodoCategory[] = [
  { id: "c1", name: "건강", color: "#5b8c3e", sortOrder: 10, createdAt: "2026-08-01" },
  { id: "c2", name: "집안일", color: "#e07a5f", sortOrder: 20, createdAt: "2026-08-01" },
];

describe("활성 기간 — 과거 기록은 고정된다", () => {
  it("오늘 추가한 항목은 어제 진행률을 바꾸지 않는다", () => {
    const old = todo({ id: "a", startDate: "2026-08-01", doneDates: ["2026-08-17"] });
    const before = progressOn([old], "2026-08-17");
    const added = todo({ id: "b", title: "새 항목", startDate: "2026-08-18" });
    const after = progressOn([old, added], "2026-08-17");
    expect(before).toEqual({ done: 1, total: 1, pct: 100 });
    expect(after).toEqual(before);
  });

  it("그만둔 항목도 어제 목록과 진행률에 그대로 남는다", () => {
    const t = todo({ startDate: "2026-08-01", endDate: "2026-08-18", doneDates: ["2026-08-17"] });
    expect(activeOn([t], "2026-08-17")).toHaveLength(1);
    expect(progressOn([t], "2026-08-17").pct).toBe(100);
    expect(activeOn([t], "2026-08-18")).toHaveLength(0);
  });

  it("같은 날 만들고 그만두면 어느 날짜에도 뜨지 않는다", () => {
    const t = todo({ startDate: "2026-08-18", endDate: "2026-08-18" });
    expect(activeOn([t], "2026-08-17")).toHaveLength(0);
    expect(activeOn([t], "2026-08-18")).toHaveLength(0);
    expect(activeOn([t], "2026-08-19")).toHaveLength(0);
  });
});

describe("1회성 항목", () => {
  it("지정일에만 분모에 들어간다", () => {
    const t = todo({ title: "본가 방문", onceDate: "2026-08-20", startDate: "2026-08-20" });
    expect(progressOn([t], "2026-08-19").total).toBe(0);
    expect(progressOn([t], "2026-08-20").total).toBe(1);
    expect(progressOn([t], "2026-08-21").total).toBe(0);
  });

  it("startDate가 지정일보다 빨라도 지정일에만 뜬다", () => {
    const t = todo({ onceDate: "2026-08-20", startDate: "2026-08-01" });
    expect(activeOn([t], "2026-08-05")).toHaveLength(0);
    expect(activeOn([t], "2026-08-20")).toHaveLength(1);
  });
});

describe("체크 토글", () => {
  it("같은 날짜를 두 번 체크해도 한 번만 들어간다", () => {
    let t = todo();
    t = toggleDone(t, "2026-08-18");
    expect(t.doneDates).toEqual(["2026-08-18"]);
    t = toggleDone(t, "2026-08-18");
    expect(t.doneDates).toEqual([]);
    t = toggleDone(t, "2026-08-18");
    expect(t.doneDates).toEqual(["2026-08-18"]);
  });

  it("doneDates는 오름차순을 유지한다", () => {
    let t = todo({ doneDates: ["2026-08-18"] });
    t = toggleDone(t, "2026-08-15");
    expect(t.doneDates).toEqual(["2026-08-15", "2026-08-18"]);
  });

  it("원본을 변형하지 않는다", () => {
    const t = todo();
    toggleDone(t, "2026-08-18");
    expect(t.doneDates).toEqual([]);
  });
});

describe("진행률", () => {
  it("활성 항목이 없는 날은 0%다", () => {
    expect(progressOn([], "2026-08-18")).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it("3/8은 38%로 반올림된다", () => {
    const todos = Array.from({ length: 8 }, (_, i) =>
      todo({ id: `t${i}`, doneDates: i < 3 ? ["2026-08-18"] : [] })
    );
    expect(progressOn(todos, "2026-08-18")).toEqual({ done: 3, total: 8, pct: 38 });
  });

  it("체크는 그 날짜에만 반영된다", () => {
    const t = todo({ doneDates: ["2026-08-17"] });
    expect(isDoneOn(t, "2026-08-17")).toBe(true);
    expect(isDoneOn(t, "2026-08-18")).toBe(false);
  });
});

describe("카테고리 묶기", () => {
  it("모든 활성 항목이 정확히 한 그룹에 들어간다", () => {
    const todos = [
      todo({ id: "a", categoryId: "c1" }),
      todo({ id: "b", categoryId: "c2" }),
      todo({ id: "c", categoryId: "c2" }),
    ];
    const groups = groupByCategory(todos, cats, "2026-08-18");
    const sum = groups.reduce((n, g) => n + g.items.length, 0);
    expect(sum).toBe(activeOn(todos, "2026-08-18").length);
  });

  it("카테고리 sortOrder → 항목 sortOrder → 제목 순으로 정렬된다", () => {
    const todos = [
      todo({ id: "a", categoryId: "c2", title: "설거지", sortOrder: 20 }),
      todo({ id: "b", categoryId: "c1", title: "나중", sortOrder: 30 }),
      todo({ id: "c", categoryId: "c1", title: "가", sortOrder: 10 }),
      todo({ id: "d", categoryId: "c1", title: "나", sortOrder: 10 }),
    ];
    const groups = groupByCategory(todos, cats, "2026-08-18");
    expect(groups.map((g) => g.cat.id)).toEqual(["c1", "c2"]);
    expect(groups[0].items.map((t) => t.title)).toEqual(["가", "나", "나중"]);
  });

  it("빈 카테고리는 그룹으로 나오지 않는다", () => {
    const groups = groupByCategory([todo({ categoryId: "c1" })], cats, "2026-08-18");
    expect(groups.map((g) => g.cat.id)).toEqual(["c1"]);
  });

  it("카테고리가 사라진 항목도 '기타'로 살아남는다", () => {
    const orphan = todo({ id: "z", categoryId: "없는카테고리" });
    const groups = groupByCategory([orphan], cats, "2026-08-18");
    expect(groups).toHaveLength(1);
    expect(groups[0].cat.name).toBe("기타");
    expect(groups[0].items).toHaveLength(1);
  });

  it("그룹의 done/total은 그 그룹 항목만 센다", () => {
    const todos = [
      todo({ id: "a", categoryId: "c1", doneDates: ["2026-08-18"] }),
      todo({ id: "b", categoryId: "c1" }),
      todo({ id: "c", categoryId: "c2", doneDates: ["2026-08-18"] }),
    ];
    const groups = groupByCategory(todos, cats, "2026-08-18");
    expect(groups[0]).toMatchObject({ done: 1, total: 2 });
    expect(groups[1]).toMatchObject({ done: 1, total: 1 });
  });
});

describe("월 히트맵", () => {
  const todos = [
    todo({ id: "a", startDate: "2026-08-01", doneDates: ["2026-08-01", "2026-08-03"] }),
    todo({ id: "b", startDate: "2026-08-01" }),
    todo({ id: "c", title: "본가", onceDate: "2026-08-25", startDate: "2026-08-25" }),
  ];

  it("각 날짜 pct는 같은 날짜 progressOn과 같다", () => {
    const cells = monthProgress(todos, "2026-08", 80);
    for (const c of cells) {
      expect(c.pct).toBe(progressOn(todos, c.iso).pct);
    }
  });

  it("달의 날짜 수만큼 나온다", () => {
    expect(monthProgress(todos, "2026-08", 80)).toHaveLength(31);
    expect(monthProgress(todos, "2026-02", 80)).toHaveLength(28);
  });

  it("목표 미만이면 달성이 아니다", () => {
    const cells = monthProgress(todos, "2026-08", 80);
    const d1 = cells.find((c) => c.iso === "2026-08-01")!;
    expect(d1.pct).toBe(50);
    expect(d1.achieved).toBe(false);
  });

  it("항목이 없는 날은 달성이 아니다", () => {
    const cells = monthProgress(todos, "2026-07", 80);
    expect(cells.every((c) => c.total === 0 && c.achieved === false)).toBe(true);
  });

  it("1회성이 예정된 날은 hasOnce가 참이다", () => {
    const cells = monthProgress(todos, "2026-08", 80);
    expect(cells.find((c) => c.iso === "2026-08-25")!.hasOnce).toBe(true);
    expect(cells.find((c) => c.iso === "2026-08-24")!.hasOnce).toBe(false);
  });
});

describe("achievedOn — 달성 판정은 한 곳에서만 정의된다", () => {
  it("목표에 정확히 걸치면 달성이다 (pct === goalPct)", () => {
    const todos = [
      todo({ id: "a", doneDates: ["2026-08-18"] }),
      todo({ id: "b", doneDates: ["2026-08-18"] }),
      todo({ id: "c", doneDates: ["2026-08-18"] }),
      todo({ id: "d" }),
    ];
    expect(progressOn(todos, "2026-08-18").pct).toBe(75);
    expect(achievedOn(todos, "2026-08-18", 75)).toBe(true);
  });

  it("목표에 1 모자라면 달성이 아니다", () => {
    const todos = [
      todo({ id: "a", doneDates: ["2026-08-18"] }),
      todo({ id: "b", doneDates: ["2026-08-18"] }),
      todo({ id: "c", doneDates: ["2026-08-18"] }),
      todo({ id: "d" }),
    ];
    expect(progressOn(todos, "2026-08-18").pct).toBe(75);
    expect(achievedOn(todos, "2026-08-18", 76)).toBe(false);
  });

  it("활성 항목이 0개인 날은 달성이 아니다", () => {
    expect(achievedOn([], "2026-08-18", 0)).toBe(false);
  });

  it("monthProgress의 각 날짜 achieved는 같은 날짜 achievedOn과 같다 (헤어지지 않는다)", () => {
    const todos = [
      todo({ id: "a", startDate: "2026-08-01", doneDates: ["2026-08-01", "2026-08-03"] }),
      todo({ id: "b", startDate: "2026-08-01" }),
      todo({ id: "c", title: "본가", onceDate: "2026-08-25", startDate: "2026-08-25" }),
    ];
    const cells = monthProgress(todos, "2026-08", 80);
    for (const c of cells) {
      expect(c.achieved).toBe(achievedOn(todos, c.iso, 80));
    }
  });
});

describe("편집 — 성격과 활성 구간은 고정된다", () => {
  it("매일 항목을 편집해도 어제 활성 목록과 진행률이 그대로다", () => {
    const t = todo({ startDate: "2026-08-01", doneDates: ["2026-08-05"] });
    const before = progressOn([t], "2026-08-05");
    const edited = applyEdit(t, { title: "바뀐 제목", categoryId: "c2" });
    expect(progressOn([edited], "2026-08-05")).toEqual(before);
    expect(edited.startDate).toBe("2026-08-01");
    expect(edited.endDate).toBeNull();
    expect(edited.onceDate).toBeNull();
  });

  it("매일 항목은 편집으로 1회성이 되지 않는다", () => {
    const t = todo({ startDate: "2026-08-01" });
    const edited = applyEdit(t, { title: "양치", categoryId: "c1", onceDate: "2026-08-20" });
    expect(edited.onceDate).toBeNull();
    expect(edited.startDate).toBe("2026-08-01");
  });

  it("1회성 항목은 편집으로 매일이 되지 않는다", () => {
    const t = todo({ onceDate: "2026-08-05", startDate: "2026-08-05" });
    const edited = applyEdit(t, { title: "본가 방문", categoryId: "c1" });
    expect(edited.onceDate).toBe("2026-08-05");
  });

  it("1회성 지정일을 옮기면 startDate가 따라가고 endDate는 그대로다", () => {
    const t = todo({ onceDate: "2026-08-05", startDate: "2026-08-05" });
    const edited = applyEdit(t, { title: "본가 방문", categoryId: "c1", onceDate: "2026-08-20" });
    expect(edited.onceDate).toBe("2026-08-20");
    expect(edited.startDate).toBe("2026-08-20");
    expect(edited.endDate).toBeNull();
    expect(activeOn([edited], "2026-08-05")).toHaveLength(0);
    expect(activeOn([edited], "2026-08-20")).toHaveLength(1);
  });

  it("편집은 원본을 변형하지 않는다", () => {
    const t = todo({ startDate: "2026-08-01" });
    applyEdit(t, { title: "바뀜", categoryId: "c2" });
    expect(t.title).toBe("양치");
    expect(t.categoryId).toBe("c1");
  });
});

describe("스트릭", () => {
  // 8/16·8/17 100%, 8/18(오늘)은 아직 0%
  const todos = [todo({ startDate: "2026-08-16", doneDates: ["2026-08-16", "2026-08-17"] })];

  it("오늘이 아직 미달이면 어제까지를 센다", () => {
    expect(streak(todos, "2026-08-18", 80)).toBe(2);
  });

  it("오늘 목표를 넘기면 오늘이 포함된다", () => {
    const done = [todo({ startDate: "2026-08-16", doneDates: ["2026-08-16", "2026-08-17", "2026-08-18"] })];
    expect(streak(done, "2026-08-18", 80)).toBe(3);
  });

  it("미달일에서 끊긴다", () => {
    const gap = [todo({ startDate: "2026-08-01", doneDates: ["2026-08-17", "2026-08-15"] })];
    expect(streak(gap, "2026-08-18", 80)).toBe(1);
  });

  it("항목이 하나도 없으면 0이다", () => {
    expect(streak([], "2026-08-18", 80)).toBe(0);
  });
});
