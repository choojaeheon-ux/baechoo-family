import { addMonths } from "./format";

// 배추 정기 백신 5종은 모두 연 1회 부스터다.
export const VACCINE_INTERVAL_MONTHS = 12;

// 다음 접종 예정일 = 최근 접종일 + 12개월. 미접종이면 null.
export function vaccineNextDue(lastDone: string | null): string | null {
  return lastDone ? addMonths(lastDone, VACCINE_INTERVAL_MONTHS) : null;
}

// 예정일이 아직 오지 않았으면 완료. 예정일 당일은 "오늘 맞아야 함"이므로 미완료다.
export function vaccineDone(lastDone: string | null, today: string): boolean {
  const due = vaccineNextDue(lastDone);
  return due !== null && due > today;
}
