import type { VaccineDose } from "./types";

// 접종일이 가장 늦은 차수 (없으면 null) — 최근 접종 표시·정렬용
export function latestDose(doses: VaccineDose[]): VaccineDose | null {
  if (doses.length === 0) return null;
  return doses.reduce((a, b) => (b.date > a.date ? b : a));
}

// 다음 차수 번호 = max(n) + 1 (없으면 1)
export function nextDoseNumber(doses: VaccineDose[]): number {
  return doses.reduce((m, d) => Math.max(m, d.n), 0) + 1;
}
