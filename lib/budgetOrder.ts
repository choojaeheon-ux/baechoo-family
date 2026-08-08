import type { BudgetGroup } from "./compute";
import type { Budget } from "./types";

// 표시 순서대로 평탄화한 뒤 sortOrder를 0..n-1로 다시 매긴다.
// 백필이나 수동 편집으로 값이 비거나 중복돼도 이동 한 번이면 정상화된다.
function reindex(groups: BudgetGroup[]): Budget[] {
  return groups
    .flatMap((g) => g.rows)
    .map((row, i) => ({ ...row, sortOrder: i }));
}

// 같은 카테고리 안에서 과목을 한 칸 옮긴다. 카테고리 경계는 넘지 않는다.
// 경계를 벗어나는 요청은 무동작 — 현재 순서를 그대로 돌려준다.
export function moveSubject(
  groups: BudgetGroup[],
  groupName: string,
  index: number,
  dir: -1 | 1
): Budget[] {
  const gi = groups.findIndex((g) => g.name === groupName);
  if (gi < 0) return reindex(groups);
  const rows = groups[gi].rows;
  const to = index + dir;
  if (index < 0 || index >= rows.length || to < 0 || to >= rows.length) {
    return reindex(groups);
  }
  const next = rows.slice();
  [next[index], next[to]] = [next[to], next[index]];
  const nextGroups = groups.slice();
  nextGroups[gi] = { ...groups[gi], rows: next };
  return reindex(nextGroups);
}

// 카테고리 블록을 통째로 한 칸 옮긴다. 소속 과목이 함께 움직인다.
export function moveGroup(
  groups: BudgetGroup[],
  groupIndex: number,
  dir: -1 | 1
): Budget[] {
  const to = groupIndex + dir;
  if (groupIndex < 0 || groupIndex >= groups.length || to < 0 || to >= groups.length) {
    return reindex(groups);
  }
  const next = groups.slice();
  [next[groupIndex], next[to]] = [next[to], next[groupIndex]];
  return reindex(next);
}
