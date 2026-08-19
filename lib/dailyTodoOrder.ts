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

// 두 행의 sortOrder를 맞바꾼 전체 배열.
function swapPair<T extends Ordered>(all: T[], aId: string, bId: string): T[] {
  const a = all.find((r) => r.id === aId)!;
  const b = all.find((r) => r.id === bId)!;
  return all.map((r) =>
    r.id === a.id
      ? { ...r, sortOrder: b.sortOrder }
      : r.id === b.id
        ? { ...r, sortOrder: a.sortOrder }
        : r
  );
}

// 이동 공통 코어. 범위를 먼저 확인하므로 무동작 요청은 아무것도 쓰지 않는다.
// 동점 치유는 맞바꿀 두 행이 실제로 겹칠 때만 — 그때만 그 그룹을 다시 매긴다.
function move<T extends Ordered>(
  all: T[],
  scope: (r: T) => boolean,
  visibleIds: string[],
  id: string,
  dir: -1 | 1,
  cmp: (a: T, b: T) => number
): T[] {
  const visible = new Set(visibleIds);
  const siblingsOf = (rows: T[]) => rows.filter((r) => scope(r) && visible.has(r.id)).sort(cmp);

  const siblings = siblingsOf(all);
  const i = siblings.findIndex((r) => r.id === id);
  const to = i + dir;
  if (i < 0 || to < 0 || to >= siblings.length) return all;

  if (siblings[i].sortOrder !== siblings[to].sortOrder) {
    return swapPair(all, siblings[i].id, siblings[to].id);
  }

  // 맞바꿀 두 행의 sortOrder가 같으면 맞바꿔도 순서가 그대로다.
  // 현재 표시 순서를 유지한 채 그 그룹만 0..n-1로 다시 매긴 뒤 맞바꾼다.
  // healTies는 순서를 보존하므로 재정렬 후에도 i·to의 위치는 그대로다.
  const healed = healTies(all, all.filter(scope), cmp);
  const hs = siblingsOf(healed);
  return swapPair(healed, hs[i].id, hs[to].id);
}

export function moveCategory(
  cats: DailyTodoCategory[],
  visibleIds: string[],
  catId: string,
  dir: -1 | 1
): DailyTodoCategory[] {
  if (!cats.some((c) => c.id === catId)) return cats;
  return move(cats, () => true, visibleIds, catId, dir, byOrder<DailyTodoCategory>((c) => c.name));
}

export function moveTodo(
  todos: DailyTodo[],
  visibleIds: string[],
  todoId: string,
  dir: -1 | 1
): DailyTodo[] {
  const target = todos.find((t) => t.id === todoId);
  if (!target) return todos;
  return move(
    todos,
    (t) => t.categoryId === target.categoryId,
    visibleIds,
    todoId,
    dir,
    byOrder<DailyTodo>((t) => t.title)
  );
}
