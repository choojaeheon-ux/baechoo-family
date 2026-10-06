// 원탭 기록 규칙 — 버튼을 누르는 순간 저장할 행을 만든다(스펙 §6).
// id는 호출부가 newId()로 미리 만든다 — 되돌리기·위치 덧쓰기가 같은 id를 가리키게.
import type {
  BaechooHealth,
  BaechooMeal,
  BaechooStool,
  BaechooWalk,
  LatLng,
  MealType,
} from "./types";
import { toISODate } from "./format";
import { hhmmOf, localMs } from "./baechooEvents";

const sortKey = (m: BaechooMeal) => `${m.date} ${m.time ?? ""}`;

// 재헌 결정: 직전 식사 전부 복사(사료·토핑·양). 간식도 같은 규칙. 메모는 그때그때라 비운다.
export function quickMeal(meals: BaechooMeal[], mealType: MealType, now: Date, id: string): BaechooMeal {
  let prev: BaechooMeal | null = null;
  for (const m of meals) {
    if (m.mealType === mealType && (prev == null || sortKey(m) > sortKey(prev))) prev = m;
  }
  return {
    id,
    date: toISODate(now),
    mealType,
    time: hhmmOf(now.getTime()),
    content: prev?.content ?? "",
    topping: mealType === "meal" ? prev?.topping ?? null : null,
    amount: prev?.amount ?? null,
    memo: null,
  };
}

export function quickWalk(now: Date, id: string): BaechooWalk {
  return {
    id,
    date: toISODate(now),
    startTime: now.toISOString(),
    durationSec: 0,
    distanceM: 0,
    route: [],
    stools: [],
    memo: null,
  };
}

export function quickStool(now: Date, id: string): BaechooStool {
  return { id, date: toISODate(now), time: hhmmOf(now.getTime()), state: "normal", memo: null };
}

export function quickEtc(now: Date, id: string): BaechooHealth {
  return {
    id,
    date: toISODate(now),
    healthType: "etc",
    title: "",
    time: hhmmOf(now.getTime()),
    nextDate: null,
    memo: null,
  };
}

// 위치는 저장 뒤 몇 초 늦게 도착한다. 컨텍스트가 함수형 setState로 「그 순간의 최신 목록」에 적용한다 —
// 없으면(되돌리기로 삭제) 그대로 두어 되살리지 않고, 있으면 그 사이 고친 내용은 두고 위치만 더한다.
// (DB 쪽은 repo.patchBaechooWalkRoute가 route 칸만, 삭제 안 된 행에만 쓴다.)
export function applyWalkRoute(walks: BaechooWalk[], id: string, pos: LatLng): BaechooWalk[] {
  return walks.map((w) => (w.id === id && w.route.length === 0 ? { ...w, route: [pos] } : w));
}

export function recentAmounts(meals: BaechooMeal[], mealType: MealType, limit = 4): string[] {
  const sorted = meals
    .filter((m) => m.mealType === mealType && m.amount)
    .sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1));
  const out: string[] = [];
  for (const m of sorted) {
    const a = (m.amount ?? "").trim();
    if (a && !out.includes(a)) out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

// 상세 시트의 날짜·시작·끝(HH:MM) → 저장 값. 끝이 시작보다 이르면 자정을 넘긴 것.
export function walkTimes(
  date: string,
  start: string,
  end: string | null
): { date: string; startTime: string; durationSec: number } {
  const s = localMs(date, start);
  let e = end ? localMs(date, end) : s;
  if (e < s) e += 86_400_000;
  return { date, startTime: new Date(s).toISOString(), durationSec: Math.round((e - s) / 1000) };
}

// 산책에서 돌아와 바로 누르면 지금, 나중에 고치면 시작 + 15분
export function defaultWalkEnd(startMs: number, nowMs: number): string {
  const span = nowMs - startMs;
  return hhmmOf(span >= 60_000 && span <= 3 * 3_600_000 ? nowMs : startMs + 15 * 60_000);
}
