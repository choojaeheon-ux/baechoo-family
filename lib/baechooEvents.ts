// 배추 기록 이벤트 모델 — 식사·산책·응가·건강 네 테이블을 하나의 목록으로 합친다.
// 기록 탭(타임라인·마지막 기록)과 패턴 탭(일과표·주간·간격)이 전부 이 목록을 그려
// 화면끼리 숫자가 갈라지지 않는다. 설계: docs/superpowers/specs/2026-10-06-배추-기록-패턴-개편-design.md §4
import {
  HEALTH_TYPE_LABEL,
  STOOL_STATE_LABEL,
  type BaechooHealth,
  type BaechooMeal,
  type BaechooStool,
  type BaechooWalk,
  type StoolState,
} from "./types";
import { parseNames } from "./mealNames";
import { toISODate } from "./format";

export type EventKind = "meal" | "snack" | "walk" | "stool" | "etc";
export const EVENT_KINDS: EventKind[] = ["meal", "snack", "walk", "stool", "etc"];

export const KIND_LABEL: Record<EventKind, string> = {
  meal: "식사",
  snack: "간식",
  walk: "산책",
  stool: "응가",
  etc: "기타",
};

// 면 = 버튼·차트, 글자 = 흰·회색 바탕 위 라벨(대비 4.5:1 이상 실측 — 스펙 §9)
export const KIND_COLOR: Record<EventKind, { face: string; text: string }> = {
  meal: { face: "#ff9500", text: "#b35400" },
  snack: { face: "#ff2d55", text: "#d70039" },
  walk: { face: "#34c759", text: "#1b7432" },
  stool: { face: "#a2845e", text: "#7f6545" },
  etc: { face: "#af52de", text: "#8e3fb8" },
};

export type EventTable = "meal" | "walk" | "stool" | "health";
export interface EventSource {
  table: EventTable;
  id: string;
}

// 응가 한 번 — 독립 응가든 산책 안 응가든 같은 모양
export interface StoolMark {
  at: number;
  state: StoolState;
  source: EventSource;
}

export interface BaechooEvent {
  key: string;
  kind: EventKind;
  date: string; // 로컬 YYYY-MM-DD (시작 기준)
  startAt: number | null; // 로컬 시각 epoch ms, null = 시각 없음(옛 건강 기록)
  endAt: number | null; // 산책만, 소요 > 0일 때
  label: string;
  detail: string;
  stools: StoolMark[]; // 산책만
  state: StoolState | null; // 독립 응가만
  source: EventSource;
}

const MIN = 60_000;
const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" + "HH:MM" → 로컬 시각 epoch ms
export function localMs(date: string, hhmm: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi).getTime();
}

export function dateOf(ms: number): string {
  return toISODate(new Date(ms));
}

export function hhmmOf(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 타임라인 시각 "오후 02:28"
export function ampmLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${pad(h12)}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
// "10월 5일 (월)"
export function dayHeader(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

// "40분" / "1시간" / "1시간 5분" / 하루가 넘으면 "3일 22시간"(간격 패턴에서 읽히게, 분은 버림)
export function durationLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  if (h >= 24) return h % 24 === 0 ? `${h / 24}일` : `${Math.floor(h / 24)}일 ${h % 24}시간`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function mealDetail(m: BaechooMeal): string {
  const names = [...parseNames(m.content), ...parseNames(m.topping)].join(" + ");
  return [names, m.amount ?? ""].filter(Boolean).join(" · ");
}

// 산책 안 응가 시각 — 시작일 + HH:MM. 시작보다 이르면 자정을 넘긴 것(1분 여유는 같은 분 기록용).
function walkStoolAt(startAt: number, time: string | null): number {
  if (!time) return startAt;
  const at = localMs(dateOf(startAt), time);
  return at < startAt - MIN ? at + DAY : at;
}

function walkStoolLabel(states: StoolState[]): string {
  const real = states.filter((s) => s !== "fail");
  return real.length ? `응가 ${real.map((s) => STOOL_STATE_LABEL[s]).join("·")}` : "";
}

export function toEvents(
  meals: BaechooMeal[],
  walks: BaechooWalk[],
  stools: BaechooStool[],
  health: BaechooHealth[]
): BaechooEvent[] {
  const out: BaechooEvent[] = [];
  for (const m of meals) {
    out.push({
      key: `meal:${m.id}`,
      kind: m.mealType,
      date: m.date,
      startAt: m.time ? localMs(m.date, m.time) : null,
      endAt: null,
      label: KIND_LABEL[m.mealType],
      detail: mealDetail(m),
      stools: [],
      state: null,
      source: { table: "meal", id: m.id },
    });
  }
  for (const w of walks) {
    const startAt = w.startTime ? new Date(w.startTime).getTime() : null;
    const source: EventSource = { table: "walk", id: w.id };
    out.push({
      key: `walk:${w.id}`,
      kind: "walk",
      date: startAt == null ? w.date : dateOf(startAt),
      startAt,
      endAt: startAt != null && w.durationSec > 0 ? startAt + w.durationSec * 1000 : null,
      label: KIND_LABEL.walk,
      detail: [
        w.durationSec > 0 ? durationLabel(w.durationSec * 1000) : "",
        walkStoolLabel(w.stools.map((s) => s.state)),
      ]
        .filter(Boolean)
        .join(" · "),
      stools:
        startAt == null
          ? []
          : w.stools.map((s) => ({ at: walkStoolAt(startAt, s.time), state: s.state, source })),
      state: null,
      source,
    });
  }
  for (const s of stools) {
    out.push({
      key: `stool:${s.id}`,
      kind: "stool",
      date: s.date,
      startAt: s.time ? localMs(s.date, s.time) : null,
      endAt: null,
      label: KIND_LABEL.stool,
      detail: [STOOL_STATE_LABEL[s.state], s.memo ?? ""].filter(Boolean).join(" · "),
      stools: [],
      state: s.state,
      source: { table: "stool", id: s.id },
    });
  }
  for (const h of health) {
    out.push({
      key: `health:${h.id}`,
      kind: "etc",
      date: h.date,
      startAt: h.time ? localMs(h.date, h.time) : null,
      endAt: null,
      label: HEALTH_TYPE_LABEL[h.healthType] ?? KIND_LABEL.etc,
      detail: h.title,
      stools: [],
      state: null,
      source: { table: "health", id: h.id },
    });
  }
  return out;
}

export interface DayGroup {
  date: string;
  timed: BaechooEvent[];
  untimed: BaechooEvent[];
}

export function groupByDay(events: BaechooEvent[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of events) {
    const g = map.get(e.date) ?? { date: e.date, timed: [], untimed: [] };
    (e.startAt == null ? g.untimed : g.timed).push(e);
    map.set(e.date, g);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.timed.sort((a, b) => (b.startAt ?? 0) - (a.startAt ?? 0) || a.key.localeCompare(b.key));
  }
  return groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function allStools(events: BaechooEvent[]): StoolMark[] {
  const out: StoolMark[] = [];
  for (const e of events) {
    if (e.kind === "stool" && e.startAt != null && e.state) {
      out.push({ at: e.startAt, state: e.state, source: e.source });
    } else if (e.kind === "walk") {
      out.push(...e.stools);
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

export interface DaySummary {
  meal: number;
  snack: number;
  walk: number;
  walkMs: number;
  stool: number;
  etc: number;
}

export function daySummary(events: BaechooEvent[], date: string): DaySummary {
  const s: DaySummary = { meal: 0, snack: 0, walk: 0, walkMs: 0, stool: 0, etc: 0 };
  for (const e of events) {
    if (e.date !== date) continue;
    if (e.kind === "meal") s.meal++;
    else if (e.kind === "snack") s.snack++;
    else if (e.kind === "etc") s.etc++;
    else if (e.kind === "walk") {
      s.walk++;
      if (e.startAt != null && e.endAt != null) s.walkMs += e.endAt - e.startAt;
    }
  }
  s.stool = allStools(events).filter((m) => m.state !== "fail" && dateOf(m.at) === date).length;
  return s;
}

export function summaryLabel(s: DaySummary): string {
  const parts: string[] = [];
  if (s.meal) parts.push(`식사 ${s.meal}`);
  if (s.snack) parts.push(`간식 ${s.snack}`);
  if (s.walk) parts.push(s.walkMs > 0 ? `산책 ${s.walk}회 ${durationLabel(s.walkMs)}` : `산책 ${s.walk}회`);
  if (s.stool) parts.push(`응가 ${s.stool}`);
  if (s.etc) parts.push(`기타 ${s.etc}`);
  return parts.join(" · ");
}

// 지금보다 1분 넘게 미래인 기록(날짜 오입력)은 「마지막」으로 치지 않는다
export function lastOf(events: BaechooEvent[], kind: EventKind, nowMs: number): BaechooEvent | null {
  let best: BaechooEvent | null = null;
  for (const e of events) {
    if (e.kind !== kind || e.startAt == null || e.startAt > nowMs + MIN) continue;
    if (best == null || e.startAt > (best.startAt ?? 0)) best = e;
  }
  return best;
}

export function lastStool(events: BaechooEvent[], nowMs: number): StoolMark | null {
  return allStools(events).find((m) => m.state !== "fail" && m.at <= nowMs + MIN) ?? null;
}

export function elapsedLabel(fromMs: number, nowMs: number): string {
  const min = Math.max(0, Math.floor((nowMs - fromMs) / MIN));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 === 0 ? `${h}시간 전` : `${h}시간 ${min % 60}분 전`;
  const d = Math.floor(h / 24);
  return h % 24 === 0 ? `${d}일 전` : `${d}일 ${h % 24}시간 전`;
}
