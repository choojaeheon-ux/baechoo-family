import { describe, it, expect } from "vitest";
import {
  toEvents,
  groupByDay,
  allStools,
  daySummary,
  summaryLabel,
  lastOf,
  lastStool,
  elapsedLabel,
  ampmLabel,
  dayHeader,
  hhmmOf,
  localMs,
  durationLabel,
} from "./baechooEvents";
import type { BaechooHealth, BaechooMeal, BaechooStool, BaechooWalk } from "./types";

const meal = (p: Partial<BaechooMeal> = {}): BaechooMeal => ({
  id: "m1", date: "2026-10-05", mealType: "meal", time: "08:00",
  content: "인섹트 프로틴", topping: "닭고기", amount: "1/1", memo: null, ...p,
});
const walk = (p: Partial<BaechooWalk> = {}): BaechooWalk => ({
  id: "w1", date: "2026-10-05", startTime: "2026-10-05T00:00:00.000Z", durationSec: 0,
  distanceM: 0, route: [], stools: [], memo: null, ...p,
});
const stool = (p: Partial<BaechooStool> = {}): BaechooStool => ({
  id: "s1", date: "2026-10-05", time: "09:00", state: "normal", memo: null, ...p,
});
const health = (p: Partial<BaechooHealth> = {}): BaechooHealth => ({
  id: "h1", date: "2026-10-05", healthType: "dental", title: "칫솔질", time: "21:00",
  nextDate: null, memo: null, ...p,
});

describe("toEvents — 네 테이블을 하나의 이벤트 목록으로", () => {
  it("산책 시작(UTC)을 한국 시각·날짜로 바꾼다 — walk.date를 믿지 않는다", () => {
    const [e] = toEvents([], [walk({ startTime: "2026-10-05T23:30:00.000Z", date: "2026-10-05" })], [], []);
    expect(e.date).toBe("2026-10-06");
    expect(hhmmOf(e.startAt!)).toBe("08:30");
  });

  it("산책 끝 = 시작 + 소요, 소요 0이면 끝 없음", () => {
    const [a, b] = toEvents([], [
      walk({ id: "a", startTime: "2026-10-05T00:00:00.000Z", durationSec: 1800 }),
      walk({ id: "b", durationSec: 0 }),
    ], [], []);
    expect(hhmmOf(a.endAt!)).toBe("09:30");
    expect(b.endAt).toBeNull();
  });

  it("자정을 넘긴 산책 안 응가는 다음 날 시각이 된다", () => {
    // 23:50 KST 시작, 응가 00:10
    const [e] = toEvents([], [walk({
      startTime: "2026-10-05T14:50:00.000Z",
      stools: [{ state: "normal", time: "00:10", lat: null, lng: null }],
    })], [], []);
    expect(e.stools[0].at).toBe(localMs("2026-10-06", "00:10"));
  });

  it("식사 상세 = 사료 + 토핑 · 양", () => {
    const [e] = toEvents([meal({ content: "인섹트 프로틴, 오리진", topping: "닭고기" })], [], [], []);
    expect(e.detail).toBe("인섹트 프로틴 + 오리진 + 닭고기 · 1/1");
    expect(e.kind).toBe("meal");
  });

  it("간식은 kind snack, 응가는 kind stool·상태, 건강은 kind etc·종류 라벨", () => {
    const evs = toEvents([meal({ id: "x", mealType: "snack", topping: null })], [], [stool({ state: "loose", memo: "조금" })], [health()]);
    expect(evs.map((e) => e.kind)).toEqual(["snack", "stool", "etc"]);
    expect(evs[1].state).toBe("loose");
    expect(evs[1].detail).toBe("묽음 · 조금");
    expect(evs[2].label).toBe("양치");
    expect(evs[2].detail).toBe("칫솔질");
  });

  it("시각 없는 옛 건강 기록은 startAt null", () => {
    const [e] = toEvents([], [], [], [health({ time: null })]);
    expect(e.startAt).toBeNull();
  });
});

describe("groupByDay", () => {
  it("날짜 최신순, 그날 안은 시각 최신순, 시각 없음은 따로", () => {
    const evs = toEvents(
      [meal({ id: "a", time: "08:00" }), meal({ id: "b", time: "18:00" }), meal({ id: "c", date: "2026-10-06", time: "07:00" })],
      [], [], [health({ time: null })]
    );
    const g = groupByDay(evs);
    expect(g.map((x) => x.date)).toEqual(["2026-10-06", "2026-10-05"]);
    expect(g[1].timed.map((e) => e.source.id)).toEqual(["b", "a"]);
    expect(g[1].untimed.map((e) => e.source.id)).toEqual(["h1"]);
  });
});

describe("응가 — 독립 응가와 산책 안 응가를 함께 본다", () => {
  const evs = toEvents([], [walk({
    startTime: "2026-10-05T00:00:00.000Z", // 09:00 KST
    stools: [
      { state: "normal", time: "09:10", lat: null, lng: null },
      { state: "fail", time: "09:20", lat: null, lng: null },
    ],
  })], [stool({ id: "s1", time: "07:00" }), stool({ id: "s2", time: "08:00", state: "fail" })], []);

  it("allStools는 두 출처를 최신순으로 합친다", () => {
    expect(allStools(evs).map((m) => hhmmOf(m.at))).toEqual(["09:20", "09:10", "08:00", "07:00"]);
  });

  it("lastStool은 응가실패를 건너뛰고, 산책 안 응가가 더 최근이면 그것을 고른다", () => {
    const m = lastStool(evs, localMs("2026-10-05", "12:00"))!;
    expect(hhmmOf(m.at)).toBe("09:10");
    expect(m.source).toEqual({ table: "walk", id: "w1" });
  });

  it("daySummary의 응가 수는 두 출처 합계(응가실패 제외)", () => {
    expect(daySummary(evs, "2026-10-05").stool).toBe(2);
  });
});

describe("daySummary / summaryLabel", () => {
  it("0인 항목은 빼고, 산책은 횟수와 총 시간", () => {
    const evs = toEvents(
      [meal({ id: "a" }), meal({ id: "b", time: "18:00" }), meal({ id: "c", mealType: "snack", time: "15:00" })],
      [walk({ durationSec: 1500 }), walk({ id: "w2", startTime: "2026-10-05T08:00:00.000Z", durationSec: 900 })],
      [], []
    );
    expect(summaryLabel(daySummary(evs, "2026-10-05"))).toBe("식사 2 · 간식 1 · 산책 2회 40분");
  });
});

describe("lastOf", () => {
  it("가장 최근 기록, 단 지금보다 미래인 기록(오입력)은 무시", () => {
    const evs = toEvents([meal({ id: "a", time: "08:00" }), meal({ id: "b", time: "23:00" })], [], [], []);
    expect(lastOf(evs, "meal", localMs("2026-10-05", "12:00"))!.source.id).toBe("a");
  });
  it("없으면 null", () => {
    expect(lastOf([], "walk", 0)).toBeNull();
  });
});

describe("표기", () => {
  it("elapsedLabel", () => {
    const now = localMs("2026-10-06", "12:00");
    expect(elapsedLabel(now - 30_000, now)).toBe("방금");
    expect(elapsedLabel(now - 13 * 60_000, now)).toBe("13분 전");
    expect(elapsedLabel(now - 133 * 60_000, now)).toBe("2시간 13분 전");
    expect(elapsedLabel(now - 120 * 60_000, now)).toBe("2시간 전");
    expect(elapsedLabel(now - 27 * 3_600_000, now)).toBe("1일 3시간 전");
    expect(elapsedLabel(now + 60_000, now)).toBe("방금");
  });
  it("durationLabel — 하루가 넘는 간격은 일·시간으로(94시간 54분 → 3일 22시간)", () => {
    expect(durationLabel(40 * 60_000)).toBe("40분");
    expect(durationLabel(65 * 60_000)).toBe("1시간 5분");
    expect(durationLabel((94 * 60 + 54) * 60_000)).toBe("3일 22시간");
    expect(durationLabel(48 * 3_600_000)).toBe("2일");
  });
  it("ampmLabel / dayHeader", () => {
    expect(ampmLabel(localMs("2026-10-05", "14:28"))).toBe("오후 02:28");
    expect(ampmLabel(localMs("2026-10-05", "00:05"))).toBe("오전 12:05");
    expect(dayHeader("2026-10-05")).toBe("10월 5일 (월)");
  });
});
