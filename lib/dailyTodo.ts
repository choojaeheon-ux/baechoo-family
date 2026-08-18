// 데일리 투두 계산 — 전부 순수함수. 컴포넌트는 여기 결과만 렌더한다.
import { addDays, daysInMonth } from "./format";
import type { DailyTodo, DailyTodoCategory } from "./types";

// 고아 항목(카테고리가 삭제된 항목)을 담는 자리. 화면에서 조용히 사라지는 것보다 낫다.
const ORPHAN_CAT: DailyTodoCategory = {
  id: "__orphan__",
  name: "기타",
  color: "#9a948a",
  sortOrder: Number.MAX_SAFE_INTEGER,
  createdAt: "",
};

// 그 날짜에 뜨는가. 판정식은 여기 하나뿐이다.
export function isActiveOn(t: DailyTodo, iso: string): boolean {
  if (t.onceDate) return t.onceDate === iso;
  return iso >= t.startDate && (t.endDate === null || iso < t.endDate);
}

export function activeOn(todos: DailyTodo[], iso: string): DailyTodo[] {
  return todos.filter((t) => isActiveOn(t, iso));
}

export function isDoneOn(t: DailyTodo, iso: string): boolean {
  return t.doneDates.includes(iso);
}

// 체크 토글 — 원본을 건드리지 않고 새 객체를 준다.
export function toggleDone(t: DailyTodo, iso: string): DailyTodo {
  const doneDates = t.doneDates.includes(iso)
    ? t.doneDates.filter((d) => d !== iso)
    : [...t.doneDates, iso].sort();
  return { ...t, doneDates };
}

export interface Progress {
  done: number;
  total: number;
  pct: number;
}

export function progressOn(todos: DailyTodo[], iso: string): Progress {
  const items = activeOn(todos, iso);
  const done = items.filter((t) => isDoneOn(t, iso)).length;
  const total = items.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function achievedOn(todos: DailyTodo[], iso: string, goalPct: number): boolean {
  const p = progressOn(todos, iso);
  return p.total > 0 && p.pct >= goalPct;
}

export interface CategoryGroup {
  cat: DailyTodoCategory;
  items: DailyTodo[];
  done: number;
  total: number;
}

export function groupByCategory(
  todos: DailyTodo[],
  cats: DailyTodoCategory[],
  iso: string
): CategoryGroup[] {
  const items = activeOn(todos, iso);
  const known = new Set(cats.map((c) => c.id));
  const buckets = items.some((t) => !known.has(t.categoryId))
    ? [...cats, ORPHAN_CAT]
    : cats;

  return [...buckets]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ko"))
    .map((cat) => {
      const own = items
        .filter((t) =>
          cat.id === ORPHAN_CAT.id ? !known.has(t.categoryId) : t.categoryId === cat.id
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ko"));
      return {
        cat,
        items: own,
        done: own.filter((t) => isDoneOn(t, iso)).length,
        total: own.length,
      };
    })
    .filter((g) => g.total > 0);
}

export interface DayCell {
  iso: string;
  pct: number;
  total: number;
  achieved: boolean;
  hasOnce: boolean;
}

// 월 히트맵. 날짜별 pct는 progressOn을 그대로 부른다 — 별도 산식을 두면
// 히트맵과 상단 링이 서로 다른 숫자를 말하게 된다.
export function monthProgress(
  todos: DailyTodo[],
  ym: string,
  goalPct: number
): DayCell[] {
  const n = daysInMonth(ym);
  const out: DayCell[] = [];
  for (let d = 1; d <= n; d++) {
    const iso = `${ym}-${String(d).padStart(2, "0")}`;
    const p = progressOn(todos, iso);
    out.push({
      iso,
      pct: p.pct,
      total: p.total,
      achieved: p.total > 0 && p.pct >= goalPct,
      hasOnce: todos.some((t) => t.onceDate === iso),
    });
  }
  return out;
}

// 목표 달성 연속 일수. 오늘은 아직 진행 중이므로, 오늘이 미달이면 어제부터 센다.
export function streak(
  todos: DailyTodo[],
  todayIso: string,
  goalPct: number
): number {
  let iso = achievedOn(todos, todayIso, goalPct) ? todayIso : addDays(todayIso, -1);
  let count = 0;
  while (achievedOn(todos, iso, goalPct)) {
    count++;
    iso = addDays(iso, -1);
  }
  return count;
}
