import { describe, it, expect } from "vitest";
import { addDays, expandEventsInRange, occurrencesByDate } from "./calendar";
import type { FamilyEvent } from "./types";

const base: FamilyEvent = {
  id: "e1",
  title: "테스트",
  startDate: "2026-07-15",
  endDate: null,
  time: null,
  assignee: "together",
  memo: null,
  recurrence: "none",
  repeatInterval: 1,
  repeatUntil: null,
  exceptions: [],
  createdAt: "2026-07-15",
};

describe("addDays", () => {
  it("월 경계·연 경계를 넘는다", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("expandEventsInRange — 단발", () => {
  it("당일 일정 1건", () => {
    const occ = expandEventsInRange([base], "2026-07-01", "2026-07-31");
    expect(occ).toHaveLength(1);
    expect(occ[0].date).toBe("2026-07-15");
    expect(occ[0].dates).toEqual(["2026-07-15"]);
  });

  it("범위 밖이면 제외", () => {
    expect(expandEventsInRange([base], "2026-08-01", "2026-08-31")).toHaveLength(0);
  });

  it("연박(멀티데이)은 덮는 날짜 전부 + 범위와 일부만 겹쳐도 포함", () => {
    const e = { ...base, startDate: "2026-07-30", endDate: "2026-08-02" };
    const occ = expandEventsInRange([e], "2026-07-01", "2026-07-31");
    expect(occ).toHaveLength(1);
    expect(occ[0].dates).toEqual(["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"]);
  });
});

describe("expandEventsInRange — 반복", () => {
  it("매주: 7일 간격", () => {
    const e = { ...base, startDate: "2026-07-01", recurrence: "weekly" as const };
    const occ = expandEventsInRange([e], "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.date)).toEqual([
      "2026-07-01", "2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29",
    ]);
  });

  it("격주(interval 2)", () => {
    const e = { ...base, startDate: "2026-07-01", recurrence: "weekly" as const, repeatInterval: 2 };
    const occ = expandEventsInRange([e], "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.date)).toEqual(["2026-07-01", "2026-07-15", "2026-07-29"]);
  });

  it("매월 31일 시작 → 짧은 달은 말일 클램프, 드리프트 없음", () => {
    const e = { ...base, startDate: "2026-01-31", recurrence: "monthly" as const };
    const occ = expandEventsInRange([e], "2026-01-01", "2026-04-30");
    expect(occ.map((o) => o.date)).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30",
    ]);
  });

  it("repeatUntil: 종료일 당일 회차는 포함, 이후 제외", () => {
    const e = {
      ...base, startDate: "2026-07-01", recurrence: "weekly" as const,
      repeatUntil: "2026-07-15",
    };
    const occ = expandEventsInRange([e], "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.date)).toEqual(["2026-07-01", "2026-07-08", "2026-07-15"]);
  });

  it("exceptions: 그 회차만 빠지고 나머지는 유지", () => {
    const e = {
      ...base, startDate: "2026-07-01", recurrence: "weekly" as const,
      exceptions: ["2026-07-08"],
    };
    const occ = expandEventsInRange([e], "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.date)).toEqual([
      "2026-07-01", "2026-07-15", "2026-07-22", "2026-07-29",
    ]);
  });

  it("반복 시작일이 범위 이전이면 범위 안 회차부터 등장", () => {
    const e = { ...base, startDate: "2026-06-03", recurrence: "weekly" as const };
    const occ = expandEventsInRange([e], "2026-07-01", "2026-07-14");
    expect(occ.map((o) => o.date)).toEqual(["2026-07-01", "2026-07-08"]);
  });
});

describe("occurrencesByDate", () => {
  it("덮는 날짜마다 매핑되고 범위 밖 날짜는 키가 없다", () => {
    const e = { ...base, startDate: "2026-07-30", endDate: "2026-08-02" };
    const map = occurrencesByDate([e], "2026-07-01", "2026-07-31");
    expect(map.get("2026-07-30")).toHaveLength(1);
    expect(map.get("2026-07-31")).toHaveLength(1);
    expect(map.has("2026-08-01")).toBe(false);
  });

  it("같은 날 여러 일정이 쌓인다", () => {
    const e2 = { ...base, id: "e2", title: "둘째" };
    const map = occurrencesByDate([base, e2], "2026-07-01", "2026-07-31");
    expect(map.get("2026-07-15")).toHaveLength(2);
  });
});
