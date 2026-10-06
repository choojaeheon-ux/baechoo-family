// 패턴 탭 계산 — 필터·간격·하루 배치·원형 좌표·필터 저장(스펙 §8). 컴포넌트는 렌더만.
import {
  EVENT_KINDS,
  KIND_LABEL,
  allStools,
  localMs,
  type BaechooEvent,
  type EventKind,
  type EventSource,
} from "./baechooEvents";
import { STOOL_STATE_LABEL } from "./types";
import { addDays } from "./format";
import { browserStore, type KV } from "./deviceStore";

export const POINT_MIN = 15; // 한 시점 기록(식사 등)의 패턴 폭

export type KindFilter = Record<EventKind, boolean>;
export const ALL_ON: KindFilter = { meal: true, snack: true, walk: true, stool: true, etc: true };

export interface TimedItem {
  key: string;
  kind: EventKind;
  at: number;
  endAt: number | null;
  label: string;
  detail: string;
  source: EventSource;
}

// 응가는 독립 응가 이벤트가 아니라 allStools(독립 + 산책 안)로 넣는다 — 응가 필터 하나가 둘 다 켜고 끈다
export function patternItems(events: BaechooEvent[], filter: KindFilter): TimedItem[] {
  const out: TimedItem[] = [];
  for (const e of events) {
    if (e.startAt == null || e.kind === "stool" || !filter[e.kind]) continue;
    out.push({ key: e.key, kind: e.kind, at: e.startAt, endAt: e.endAt, label: e.label, detail: e.detail, source: e.source });
  }
  if (filter.stool) {
    allStools(events).forEach((m, i) => {
      out.push({
        key: `stool:${i}:${m.source.table}:${m.source.id}`,
        kind: "stool",
        at: m.at,
        endAt: null,
        label: KIND_LABEL.stool,
        detail: STOOL_STATE_LABEL[m.state],
        source: m.source,
      });
    });
  }
  return out.sort((a, b) => b.at - a.at || a.key.localeCompare(b.key));
}

export interface IntervalRow {
  item: TimedItem;
  gapMs: number | null; // 바로 아래(더 오래된) 기록과의 간격
}

// 위 기록 시작 − 아래 기록 끝(없으면 시작). 베이비타임과 같은 기준. 겹치면 0.
export function withIntervals(items: TimedItem[]): IntervalRow[] {
  return items.map((item, i) => {
    const older = items[i + 1];
    if (!older) return { item, gapMs: null };
    return { item, gapMs: Math.max(0, item.at - (older.endAt ?? older.at)) };
  });
}

export interface Segment {
  key: string;
  kind: EventKind;
  startMin: number;
  endMin: number;
}
export interface DayLayout {
  segments: Segment[];
  stools: { key: string; min: number }[];
}

export function dayLayout(items: TimedItem[], date: string): DayLayout {
  const day0 = localMs(date, "00:00");
  const day1 = day0 + 1440 * 60_000;
  const segments: Segment[] = [];
  const stools: { key: string; min: number }[] = [];
  for (const it of items) {
    const inDay = it.at >= day0 && it.at < day1;
    if (it.kind === "stool") {
      if (inDay) stools.push({ key: it.key, min: (it.at - day0) / 60_000 });
      continue;
    }
    // 한 시점 기록은 그날에만 그린다(15분 폭이 다음 날로 번지지 않게). 구간(산책)은 걸친 날마다.
    if (it.endAt == null && !inDay) continue;
    const e = it.endAt ?? it.at + POINT_MIN * 60_000;
    if (e <= day0 || it.at >= day1) continue;
    segments.push({
      key: it.key,
      kind: it.kind,
      startMin: Math.max(0, (it.at - day0) / 60_000),
      endMin: Math.min(1440, (e - day0) / 60_000),
    });
  }
  segments.sort((a, b) => b.endMin - b.startMin - (a.endMin - a.startMin));
  return { segments, stools };
}

export function weekDates(endDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(endDate, i - 6));
}

export function minuteOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

// 0시 = 맨 위, 시계방향
export function polarPoint(cx: number, cy: number, r: number, min: number): { x: number; y: number } {
  const a = (min / 1440) * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

const r2 = (n: number) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? 0 : v;
};

export function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startMin: number,
  endMin: number
): string {
  const end = Math.min(endMin, startMin + 1439.9); // SVG 호는 정확히 한 바퀴를 못 그린다
  const large = end - startMin > 720 ? 1 : 0;
  const o1 = polarPoint(cx, cy, rOuter, startMin);
  const o2 = polarPoint(cx, cy, rOuter, end);
  const i2 = polarPoint(cx, cy, rInner, end);
  const i1 = polarPoint(cx, cy, rInner, startMin);
  return (
    `M${r2(o1.x)} ${r2(o1.y)} A${rOuter} ${rOuter} 0 ${large} 1 ${r2(o2.x)} ${r2(o2.y)} ` +
    `L${r2(i2.x)} ${r2(i2.y)} A${rInner} ${rInner} 0 ${large} 0 ${r2(i1.x)} ${r2(i1.y)}Z`
  );
}

export const PATTERN_FILTER_KEY = "baechoo-pattern-filter";

export function readPatternFilter(store?: KV | null): KindFilter {
  try {
    const s = store === undefined ? browserStore() : store;
    const raw = s?.getItem(PATTERN_FILTER_KEY);
    if (!raw) return { ...ALL_ON };
    const parsed = JSON.parse(raw) as Partial<Record<EventKind, unknown>>;
    const out = { ...ALL_ON };
    for (const k of EVENT_KINDS) if (typeof parsed[k] === "boolean") out[k] = parsed[k] as boolean;
    return out;
  } catch {
    return { ...ALL_ON };
  }
}

export function writePatternFilter(f: KindFilter, store?: KV | null): void {
  try {
    const s = store === undefined ? browserStore() : store;
    s?.setItem(PATTERN_FILTER_KEY, JSON.stringify(f));
  } catch {
    // 저장소 차단 — 이번 화면에만 반영
  }
}
