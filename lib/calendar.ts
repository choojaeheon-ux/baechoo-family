// 가족 캘린더 — 반복 일정 전개 (순수함수)
// 모델: 시리즈 단일 레코드 + exceptions(제외 회차 시작일). 회차는 원본 startDate에서
// k번째로 직접 계산해 드리프트를 막는다 (1/31 → 2/28 → 3/31 유지).
import { addMonths, toISODate } from "./format";
import type { FamilyEvent } from "./types";

export interface EventOccurrence {
  event: FamilyEvent;
  date: string; // 회차 시작일
  dates: string[]; // 회차가 덮는 날짜 전부 (연박 포함)
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + n));
}

// 연박 길이(일). endDate 없으면 1일.
function spanDays(e: FamilyEvent): number {
  if (!e.endDate) return 1;
  const ms = new Date(e.endDate).getTime() - new Date(e.startDate).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

// k번째 회차 시작일 (k=0이 원본)
function nthStart(e: FamilyEvent, k: number): string {
  if (e.recurrence === "weekly") return addDays(e.startDate, 7 * e.repeatInterval * k);
  return addMonths(e.startDate, e.repeatInterval * k); // monthly, 월말 클램프
}

const MAX_OCCURRENCES = 1000; // 무한 루프 방지 안전핀

export function expandEventsInRange(
  events: FamilyEvent[],
  from: string,
  to: string
): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  for (const e of events) {
    const len = spanDays(e);
    for (let k = 0; k < MAX_OCCURRENCES; k++) {
      const start = nthStart(e, k);
      if (start > to) break;
      if (e.repeatUntil && start > e.repeatUntil) break;
      const isLast = e.recurrence === "none";
      const end = addDays(start, len - 1);
      if (end >= from && !e.exceptions.includes(start)) {
        out.push({
          event: e,
          date: start,
          dates: Array.from({ length: len }, (_, i) => addDays(start, i)),
        });
      }
      if (isLast) break;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// 마커·날짜 패널용: 덮는 날짜 → 그 날의 회차들 (범위 밖 날짜는 키 생성 안 함)
export function occurrencesByDate(
  events: FamilyEvent[],
  from: string,
  to: string
): Map<string, EventOccurrence[]> {
  const map = new Map<string, EventOccurrence[]>();
  for (const occ of expandEventsInRange(events, from, to)) {
    for (const d of occ.dates) {
      if (d < from || d > to) continue;
      map.set(d, [...(map.get(d) ?? []), occ]);
    }
  }
  return map;
}
