// 데일리 투두 순서 이동 — 순수함수. 컴포넌트는 결과를 저장만 한다.
//
// 메인 화면은 그날 활성인 항목(과 그 항목이 있는 카테고리)만 보여준다.
// 그래서 이동은 "화면에 보이는 이웃과 sortOrder를 맞바꾼다"로 정의한다.
// 전체를 0..n-1로 다시 매기면 화면 밖 항목의 순서가 조용히 재배치된다 —
// 목록 전체가 화면에 있는 lib/budgetOrder.ts와 다른 점이다.
import type { DailyTodo, DailyTodoCategory } from "./types";

type Ordered = { id: string; sortOrder: number };

// 표시 순서 비교자. sortOrder가 같으면 이름으로 가른다(groupByCategory와 같은 규칙).
function byOrder<T extends Ordered>(label: (r: T) => string) {
  return (a: T, b: T) => a.sortOrder - b.sortOrder || label(a).localeCompare(label(b), "ko");
}

// 같은 그룹 안에 sortOrder가 겹치면 맞바꿔도 순서가 그대로다.
// 현재 표시 순서를 유지한 채 그 그룹만 0..n-1로 다시 매겨 자가 치유한다.
function healTies<T extends Ordered>(all: T[], scope: T[], cmp: (a: T, b: T) => number): T[] {
  const sorted = [...scope].sort(cmp);
  const tied = sorted.some((r, i) => i > 0 && r.sortOrder === sorted[i - 1].sortOrder);
  if (!tied) return all;
  const rank = new Map(sorted.map((r, i) => [r.id, i]));
  return all.map((r) => (rank.has(r.id) ? { ...r, sortOrder: rank.get(r.id)! } : r));
}

// 보이는 이웃과 sortOrder를 맞바꾼 전체 배열. 범위를 벗어나면 base를 그대로 돌려준다.
function swapWithVisibleNeighbor<T extends Ordered>(
  base: T[],
  siblings: T[],
  id: string,
  dir: -1 | 1
): T[] {
  const i = siblings.findIndex((r) => r.id === id);
  const to = i + dir;
  if (i < 0 || to < 0 || to >= siblings.length) return base;
  const a = siblings[i];
  const b = siblings[to];
  return base.map((r) =>
    r.id === a.id
      ? { ...r, sortOrder: b.sortOrder }
      : r.id === b.id
        ? { ...r, sortOrder: a.sortOrder }
        : r
  );
}

export function moveCategory(
  cats: DailyTodoCategory[],
  visibleIds: string[],
  catId: string,
  dir: -1 | 1
): DailyTodoCategory[] {
  if (!cats.some((c) => c.id === catId)) return cats;
  const cmp = byOrder<DailyTodoCategory>((c) => c.name);
  const base = healTies(cats, cats, cmp);
  const visible = new Set(visibleIds);
  const siblings = base.filter((c) => visible.has(c.id)).sort(cmp);
  return swapWithVisibleNeighbor(base, siblings, catId, dir);
}

export function moveTodo(
  todos: DailyTodo[],
  visibleIds: string[],
  todoId: string,
  dir: -1 | 1
): DailyTodo[] {
  const target = todos.find((t) => t.id === todoId);
  if (!target) return todos;
  const cmp = byOrder<DailyTodo>((t) => t.title);
  const sameCat = (t: DailyTodo) => t.categoryId === target.categoryId;
  // 동점 정규화는 대상 카테고리 안에서만 — 다른 카테고리까지 다시 매기면
  // 이동 한 번에 관계없는 행이 무더기로 저장된다.
  const base = healTies(todos, todos.filter(sameCat), cmp);
  const visible = new Set(visibleIds);
  const siblings = base.filter((t) => sameCat(t) && visible.has(t.id)).sort(cmp);
  return swapWithVisibleNeighbor(base, siblings, todoId, dir);
}
