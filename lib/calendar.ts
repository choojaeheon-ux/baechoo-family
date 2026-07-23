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

/* ── 월 그리드 연속 막대 배치 ──
   여러 날에 걸친 일정을 날짜마다 따로 그리지 않고, 한 주 안에서 하나의 막대로 잇는다.
   주 경계에서 잘리면 continuesLeft/Right로 이어짐을 표시한다. */

export interface BarItem {
  key: string;
  color: string;
  label: string;
  start: string; // 항목 실제 시작일
  end: string; // 항목 실제 종료일 (하루짜리면 start와 같음)
}

export interface WeekBar extends BarItem {
  lane: number; // 0-based 세로 줄
  startCol: number; // 0~6
  span: number; // 차지하는 칸 수
  continuesLeft: boolean;
  continuesRight: boolean;
}

export interface WeekLayout {
  bars: WeekBar[];
  overflowByDate: Map<string, number>; // 레인이 모자라 숨긴 개수
  laneCount: number; // 실제 사용한 레인 수
}

function dayIndex(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

// cols: 그 주 7일의 ISO, inMonth: 그 칸이 현재 달인지(달 밖 칸엔 막대를 그리지 않음)
export function layoutWeek(
  items: BarItem[],
  cols: string[],
  inMonth: boolean[],
  maxLanes = 3
): WeekLayout {
  const valid = inMonth.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const overflowByDate = new Map<string, number>();
  if (valid.length === 0) return { bars: [], overflowByDate, laneCount: 0 };
  const lo = valid[0];
  const hi = valid[valid.length - 1];

  // 긴 막대를 위 레인으로 → 주가 바뀌어도 위치가 크게 튀지 않는다
  const sorted = [...items]
    .map((it) => {
      const s = Math.max(lo, Math.min(hi, dayIndex(cols[0], it.start)));
      const e = Math.max(lo, Math.min(hi, dayIndex(cols[0], it.end)));
      return { it, s, e };
    })
    .filter(({ it }) => dayIndex(cols[0], it.end) >= lo && dayIndex(cols[0], it.start) <= hi)
    .sort(
      (a, b) =>
        b.e - b.s - (a.e - a.s) ||
        a.s - b.s ||
        (a.it.label < b.it.label ? -1 : a.it.label > b.it.label ? 1 : 0)
    );

  const lanes: boolean[][] = []; // lane → 칸 점유 여부
  const bars: WeekBar[] = [];
  let used = 0;
  for (const { it, s, e } of sorted) {
    let lane = lanes.findIndex((occ) => {
      for (let c = s; c <= e; c++) if (occ[c]) return false;
      return true;
    });
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(Array(7).fill(false));
    }
    for (let c = s; c <= e; c++) lanes[lane][c] = true;
    if (lane >= maxLanes) {
      for (let c = s; c <= e; c++) {
        overflowByDate.set(cols[c], (overflowByDate.get(cols[c]) ?? 0) + 1);
      }
      continue;
    }
    used = Math.max(used, lane + 1);
    bars.push({
      ...it,
      lane,
      startCol: s,
      span: e - s + 1,
      continuesLeft: dayIndex(cols[0], it.start) < s,
      continuesRight: dayIndex(cols[0], it.end) > e,
    });
  }
  return { bars, overflowByDate, laneCount: used };
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
