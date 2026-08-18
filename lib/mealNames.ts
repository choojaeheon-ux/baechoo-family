// 사료·토핑 다중 선택은 기존 텍스트 칸에 ", "로 이어 저장한다.
// 그 규약은 이 두 함수에만 있다 (설계: docs/superpowers/specs/2026-08-18-식사-사료토핑-다중선택-design.md).

export const NAME_SEPARATOR = ", ";

// "건사료, 습식" → ["건사료", "습식"]. 레거시 단일값은 항목 1개.
export function parseNames(s: string | null | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  for (const part of s.split(",")) {
    const name = part.trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

// ["건사료", "습식"] → "건사료, 습식". 공백·빈 값·중복을 함께 정리한다.
export function joinNames(names: string[]): string {
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out.join(NAME_SEPARATOR);
}
