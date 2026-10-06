import { describe, it, expect } from "vitest";
import { walkStoolsToRecords } from "./walkStoolMigration";
import type { BaechooWalk } from "./types";

const walk = (p: Partial<BaechooWalk>): BaechooWalk => ({
  id: "w1",
  date: "2026-10-05",
  startTime: "2026-10-04T22:30:00.000Z", // 07:30 KST 10/05
  durationSec: 1500,
  distanceM: 0,
  route: [],
  stools: [],
  memo: null,
  ...p,
});

describe("walkStoolsToRecords — 산책 안 응가를 응가 기록으로", () => {
  it("날짜는 산책 시작(한국 시각) 기준, 시각·상태는 그대로", () => {
    const rows = walkStoolsToRecords([
      walk({ stools: [{ state: "loose", time: "07:45", lat: 37.39, lng: 126.95 }] }),
    ]);
    expect(rows).toEqual([{ id: "ws-w1-0", date: "2026-10-05", time: "07:45", state: "loose", memo: null }]);
  });

  it("UTC로 전날인 산책도 한국 날짜로 옮긴다", () => {
    const rows = walkStoolsToRecords([
      walk({ date: "2026-10-04", startTime: "2026-10-04T23:50:00.000Z", stools: [{ state: "normal", time: "09:05", lat: null, lng: null }] }),
    ]);
    expect(rows[0].date).toBe("2026-10-05");
  });

  it("시작보다 이른 시각은 자정을 넘긴 것 — 다음 날", () => {
    const rows = walkStoolsToRecords([
      walk({ startTime: "2026-10-05T14:50:00.000Z", stools: [{ state: "normal", time: "00:10", lat: null, lng: null }] }),
    ]);
    expect([rows[0].date, rows[0].time]).toEqual(["2026-10-06", "00:10"]);
  });

  it("시각이 없으면 산책 시작 시각", () => {
    const rows = walkStoolsToRecords([walk({ stools: [{ state: "normal", time: null, lat: null, lng: null }] })]);
    expect(rows[0].time).toBe("07:30");
  });

  it("id는 산책 id + 순번으로 고정 — 두 번 돌려도 중복이 생기지 않는다", () => {
    const w = walk({
      stools: [
        { state: "normal", time: "07:40", lat: null, lng: null },
        { state: "normal", time: "07:50", lat: null, lng: null },
      ],
    });
    expect(walkStoolsToRecords([w]).map((r) => r.id)).toEqual(["ws-w1-0", "ws-w1-1"]);
    expect(walkStoolsToRecords([w])).toEqual(walkStoolsToRecords([w]));
  });

  it("시작 시각이 없는 옛 산책은 산책 날짜 + 기록된 시각", () => {
    const rows = walkStoolsToRecords([
      walk({ startTime: null, date: "2026-07-01", stools: [{ state: "normal", time: "18:20", lat: null, lng: null }] }),
    ]);
    expect([rows[0].date, rows[0].time]).toEqual(["2026-07-01", "18:20"]);
  });
});
