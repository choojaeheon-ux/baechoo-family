import { describe, it, expect } from "vitest";
import { moveCategory, moveTodo } from "./dailyTodoOrder";
import type { DailyTodo, DailyTodoCategory } from "./types";

function cat(id: string, name: string, sortOrder: number): DailyTodoCategory {
  return { id, name, color: "#5b8c3e", sortOrder, createdAt: "2026-08-19" };
}

function todo(over: Partial<DailyTodo> & { id: string }): DailyTodo {
  return {
    title: "할 일",
    categoryId: "c1",
    startDate: "2026-08-01",
    endDate: null,
    onceDate: null,
    doneDates: [],
    sortOrder: 0,
    createdAt: "2026-08-01",
    ...over,
  };
}

const orderOf = <T extends { id: string; sortOrder: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sortOrder - b.sortOrder).map((r) => r.id);

describe("moveCategory", () => {
  const cats = [cat("health", "건강", 10), cat("home", "집안일", 20), cat("hobby", "취미", 30)];

  it("보이는 이웃과 자리를 바꾼다", () => {
    const next = moveCategory(cats, ["health", "home", "hobby"], "hobby", -1);
    expect(orderOf(next)).toEqual(["health", "hobby", "home"]);
  });

  it("숨은 카테고리를 건너뛰고 보이는 이웃과 바꾼다", () => {
    // 오늘 '집안일'은 항목이 없어 화면에 없다. '취미' ▲는 '건강' 위가 아니라 '건강'과 바뀌어야 한다.
    const next = moveCategory(cats, ["health", "hobby"], "hobby", -1);
    expect(orderOf(next.filter((c) => c.id !== "home"))).toEqual(["hobby", "health"]);
  });

  it("숨은 카테고리의 sortOrder는 변하지 않는다", () => {
    const next = moveCategory(cats, ["health", "hobby"], "hobby", -1);
    expect(next.find((c) => c.id === "home")!.sortOrder).toBe(20);
  });

  it("맨 위의 ▲와 맨 아래의 ▼는 순서를 바꾸지 않는다", () => {
    expect(orderOf(moveCategory(cats, ["health", "home", "hobby"], "health", -1)))
      .toEqual(["health", "home", "hobby"]);
    expect(orderOf(moveCategory(cats, ["health", "home", "hobby"], "hobby", 1)))
      .toEqual(["health", "home", "hobby"]);
  });

  it("없는 id는 입력과 같은 순서를 돌려준다", () => {
    expect(orderOf(moveCategory(cats, ["health", "home", "hobby"], "없음", -1)))
      .toEqual(["health", "home", "hobby"]);
  });

  it("sortOrder가 겹쳐도 한 번 이동하면 의도대로 움직인다", () => {
    const tied = [cat("a", "가", 5), cat("b", "나", 5), cat("c", "다", 5)];
    const next = moveCategory(tied, ["a", "b", "c"], "c", -1);
    expect(orderOf(next)).toEqual(["a", "c", "b"]);
  });

  it("원본을 변형하지 않는다", () => {
    const before = cats.map((c) => c.sortOrder);
    moveCategory(cats, ["health", "home", "hobby"], "hobby", -1);
    expect(cats.map((c) => c.sortOrder)).toEqual(before);
  });
});

describe("moveTodo", () => {
  const todos = [
    todo({ id: "a", title: "가", categoryId: "c1", sortOrder: 10 }),
    todo({ id: "b", title: "나", categoryId: "c1", sortOrder: 20 }),
    todo({ id: "c", title: "다", categoryId: "c1", sortOrder: 30 }),
    todo({ id: "x", title: "라", categoryId: "c2", sortOrder: 15 }),
  ];

  it("같은 카테고리 안에서 보이는 이웃과 자리를 바꾼다", () => {
    const next = moveTodo(todos, ["a", "b", "c", "x"], "c", -1);
    expect(orderOf(next.filter((t) => t.categoryId === "c1"))).toEqual(["a", "c", "b"]);
  });

  it("카테고리 경계를 넘지 않는다 — 다른 카테고리 항목은 그대로다", () => {
    const next = moveTodo(todos, ["a", "b", "c", "x"], "a", -1);
    expect(next.find((t) => t.id === "x")!.sortOrder).toBe(15);
  });

  it("화면에 보이지 않는 항목의 sortOrder는 변하지 않는다", () => {
    // 'b'는 오늘 안 뜨는 1회성이라 치자. 'c' ▲는 'a'와 바뀌어야 한다.
    const next = moveTodo(todos, ["a", "c"], "c", -1);
    expect(next.find((t) => t.id === "b")!.sortOrder).toBe(20);
    expect(orderOf(next.filter((t) => ["a", "c"].includes(t.id)))).toEqual(["c", "a"]);
  });

  it("보이는 목록의 맨 위 ▲와 맨 아래 ▼는 순서를 바꾸지 않는다", () => {
    expect(orderOf(moveTodo(todos, ["a", "b", "c"], "a", -1).filter((t) => t.categoryId === "c1")))
      .toEqual(["a", "b", "c"]);
    expect(orderOf(moveTodo(todos, ["a", "b", "c"], "c", 1).filter((t) => t.categoryId === "c1")))
      .toEqual(["a", "b", "c"]);
  });

  it("없는 id는 입력과 같은 순서를 돌려준다", () => {
    expect(orderOf(moveTodo(todos, ["a", "b", "c"], "없음", -1)))
      .toEqual(["a", "x", "b", "c"]);
  });

  it("같은 카테고리 안 sortOrder가 겹쳐도 한 번 이동하면 의도대로 움직인다", () => {
    const tied = [
      todo({ id: "p", title: "가", categoryId: "c1", sortOrder: 7 }),
      todo({ id: "q", title: "나", categoryId: "c1", sortOrder: 7 }),
      todo({ id: "r", title: "다", categoryId: "c1", sortOrder: 7 }),
    ];
    const next = moveTodo(tied, ["p", "q", "r"], "r", -1);
    expect(orderOf(next)).toEqual(["p", "r", "q"]);
  });

  it("동점 정규화는 다른 카테고리를 건드리지 않는다", () => {
    const mixed = [
      todo({ id: "p", title: "가", categoryId: "c1", sortOrder: 7 }),
      todo({ id: "q", title: "나", categoryId: "c1", sortOrder: 7 }),
      todo({ id: "z", title: "다", categoryId: "c2", sortOrder: 99 }),
    ];
    const next = moveTodo(mixed, ["p", "q"], "q", -1);
    expect(next.find((t) => t.id === "z")!.sortOrder).toBe(99);
  });

  it("원본을 변형하지 않는다", () => {
    const before = todos.map((t) => t.sortOrder);
    moveTodo(todos, ["a", "b", "c", "x"], "c", -1);
    expect(todos.map((t) => t.sortOrder)).toEqual(before);
  });
});
