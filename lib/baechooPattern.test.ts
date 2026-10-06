import { describe, it, expect } from "vitest";
import {
  ALL_ON,
  patternItems,
  withIntervals,
  dayLayout,
  weekDates,
  minuteOfDay,
  polarPoint,
  arcPath,
  readPatternFilter,
  writePatternFilter,
  PATTERN_FILTER_KEY,
  type TimedItem,
} from "./baechooPattern";
import { toEvents, localMs } from "./baechooEvents";
import type { BaechooMeal, BaechooStool, BaechooWalk } from "./types";

const meal = (p: Partial<BaechooMeal>): BaechooMeal => ({
  id: "m", date: "2026-10-05", mealType: "meal", time: "08:00",
  content: "", topping: null, amount: null, memo: null, ...p,
});
const walk = (p: Partial<BaechooWalk>): BaechooWalk => ({
  id: "w", date: "2026-10-05", startTime: "2026-10-04T22:30:00.000Z", // 07:30 KST
  durationSec: 50 * 60, distanceM: 0, route: [], stools: [], memo: null, ...p,
});
const stool = (p: Partial<BaechooStool>): BaechooStool => ({
  id: "s", date: "2026-10-05", time: "09:18", state: "normal", memo: null, ...p,
});
const item = (p: Partial<TimedItem>): TimedItem => ({
  key: "k", kind: "meal", at: 0, endAt: null, label: "", detail: "", source: { table: "meal", id: "k" }, ...p,
});

describe("patternItems — 필터를 거친 시간순 목록", () => {
  const evs = toEvents(
    [meal({ id: "m1", time: "09:39" })],
    [walk({ id: "w1", stools: [{ state: "normal", time: "07:45", lat: null, lng: null }] })],
    [stool({ id: "s1" })],
    []
  );

  it("응가만 켜면 산책 안 응가와 독립 응가가 한 줄로 시간순", () => {
    const only = patternItems(evs, { ...ALL_ON, meal: false, snack: false, walk: false, etc: false });
    expect(only.map((i) => [i.kind, i.source.table])).toEqual([["stool", "stool"], ["stool", "walk"]]);
  });

  it("산책을 꺼도 산책 안 응가는 응가 필터를 따른다", () => {
    const noWalk = patternItems(evs, { ...ALL_ON, walk: false });
    expect(noWalk.some((i) => i.kind === "walk")).toBe(false);
    expect(noWalk.filter((i) => i.kind === "stool")).toHaveLength(2);
  });

  it("응가를 끄면 두 출처 모두 빠진다", () => {
    expect(patternItems(evs, { ...ALL_ON, stool: false }).some((i) => i.kind === "stool")).toBe(false);
  });

  it("응가실패는 패턴에 응가로 그리지 않고 배변 간격도 끊지 않는다", () => {
    const e = toEvents([], [], [
      stool({ id: "a", time: "08:00" }),
      stool({ id: "f", time: "12:00", state: "fail" }),
      stool({ id: "b", time: "18:00" }),
    ], []);
    const stoolOnly = { ...ALL_ON, meal: false, snack: false, walk: false, etc: false };
    const rows = withIntervals(patternItems(e, stoolOnly));
    expect(rows.map((r) => r.item.source.id)).toEqual(["b", "a"]);
    expect(rows[0].gapMs).toBe(10 * 3_600_000);
  });

  it("시각 없는 기록은 패턴에 안 나온다", () => {
    const e = toEvents([meal({ id: "x", time: null })], [], [], []);
    expect(patternItems(e, ALL_ON)).toEqual([]);
  });
});

describe("withIntervals — 위 기록 시작 − 아래 기록 끝(없으면 시작)", () => {
  it("산책 07:30~08:20 다음 응가 09:18 → 58분(끝 기준)", () => {
    const rows = withIntervals([
      item({ key: "s", at: localMs("2026-10-05", "09:18") }),
      item({ key: "w", at: localMs("2026-10-05", "07:30"), endAt: localMs("2026-10-05", "08:20") }),
    ]);
    expect(rows[0].gapMs).toBe(58 * 60_000);
    expect(rows[1].gapMs).toBeNull();
  });

  it("필터를 바꾸면 남은 기록끼리 다시 잰다 — 식사만 켜면 식사 간격", () => {
    const evs = toEvents(
      [meal({ id: "a", time: "08:00" }), meal({ id: "b", time: "12:30" })],
      [walk({ id: "w1" })], // 07:30~08:20, 두 식사 사이가 아님
      [stool({ id: "s1", time: "10:00" })],
      []
    );
    const mealsOnly = { ...ALL_ON, snack: false, walk: false, stool: false, etc: false };
    const rows = withIntervals(patternItems(evs, mealsOnly));
    expect(rows.map((r) => r.item.source.id)).toEqual(["b", "a"]);
    expect(rows[0].gapMs).toBe(4.5 * 3_600_000);
  });

  it("겹치면 0(음수 아님)", () => {
    const rows = withIntervals([
      item({ key: "s", at: localMs("2026-10-05", "07:45") }),
      item({ key: "w", at: localMs("2026-10-05", "07:30"), endAt: localMs("2026-10-05", "08:20") }),
    ]);
    expect(rows[0].gapMs).toBe(0);
  });
});

describe("dayLayout — 하루 0~1440분 배치", () => {
  it("한 시점 기록은 15분 폭", () => {
    const l = dayLayout([item({ at: localMs("2026-10-05", "08:00") })], "2026-10-05");
    expect(l.segments[0]).toMatchObject({ startMin: 480, endMin: 495 });
  });

  it("23:55 기록은 1440에서 잘리고 다음 날로 번지지 않는다", () => {
    const it2 = [item({ at: localMs("2026-10-05", "23:55") })];
    expect(dayLayout(it2, "2026-10-05").segments[0]).toMatchObject({ startMin: 1435, endMin: 1440 });
    expect(dayLayout(it2, "2026-10-06").segments).toEqual([]);
  });

  it("자정을 넘긴 산책은 두 날에 나뉜다", () => {
    const w = [item({ kind: "walk", at: localMs("2026-10-05", "23:40"), endAt: localMs("2026-10-06", "00:20") })];
    expect(dayLayout(w, "2026-10-05").segments[0]).toMatchObject({ startMin: 1420, endMin: 1440 });
    expect(dayLayout(w, "2026-10-06").segments[0]).toMatchObject({ startMin: 0, endMin: 20 });
  });

  it("응가는 구간이 아니라 분 위치로", () => {
    const l = dayLayout([item({ kind: "stool", at: localMs("2026-10-05", "09:18") })], "2026-10-05");
    expect(l.segments).toEqual([]);
    expect(l.stools[0].min).toBe(558);
  });

  it("긴 구간을 먼저 그린다(짧은 띠가 위에 보이게)", () => {
    const l = dayLayout([
      item({ key: "m", at: localMs("2026-10-05", "07:40") }),
      item({ key: "w", kind: "walk", at: localMs("2026-10-05", "07:30"), endAt: localMs("2026-10-05", "08:20") }),
    ], "2026-10-05");
    expect(l.segments.map((s) => s.key)).toEqual(["w", "m"]);
  });
});

describe("날짜·좌표", () => {
  it("weekDates는 끝날 포함 7일, 오래된 날부터", () => {
    expect(weekDates("2026-10-06")).toEqual([
      "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06",
    ]);
  });
  it("minuteOfDay", () => {
    expect(minuteOfDay(localMs("2026-10-06", "11:55"))).toBe(715);
  });
  it("0시는 맨 위, 6시는 오른쪽, 12시는 아래", () => {
    const r = (p: { x: number; y: number }) => [Math.round(p.x), Math.round(p.y)];
    expect(r(polarPoint(100, 100, 50, 0))).toEqual([100, 50]);
    expect(r(polarPoint(100, 100, 50, 360))).toEqual([150, 100]);
    expect(r(polarPoint(100, 100, 50, 720))).toEqual([100, 150]);
  });
  it("arcPath 0~6시 도넛 조각", () => {
    expect(arcPath(100, 100, 50, 30, 0, 360)).toBe("M100 50 A50 50 0 0 1 150 100 L130 100 A30 30 0 0 0 100 70Z");
  });
  it("반 바퀴 넘으면 큰 호 플래그", () => {
    expect(arcPath(100, 100, 50, 30, 0, 900)).toContain("A50 50 0 1 1");
  });
});

describe("필터 기기 저장", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it("처음엔 전부 켜짐", () => {
    expect(readPatternFilter(mem())).toEqual(ALL_ON);
  });
  it("저장한 값을 다시 읽는다", () => {
    const s = mem();
    writePatternFilter({ ...ALL_ON, snack: false }, s);
    expect(readPatternFilter(s).snack).toBe(false);
  });
  it("깨진 값·빠진 키는 켜짐으로", () => {
    const s = mem();
    s.setItem(PATTERN_FILTER_KEY, '{"walk":false');
    expect(readPatternFilter(s)).toEqual(ALL_ON);
    s.setItem(PATTERN_FILTER_KEY, '{"walk":false}');
    expect(readPatternFilter(s)).toEqual({ ...ALL_ON, walk: false });
  });
  it("저장소가 던져도 화면이 죽지 않는다", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(readPatternFilter(broken)).toEqual(ALL_ON);
    expect(() => writePatternFilter(ALL_ON, broken)).not.toThrow();
  });
});
