import { describe, it, expect } from "vitest";
import { addDays, expandEventsInRange, layoutWeek, occurrencesByDate, type BarItem } from "./calendar";
import type { FamilyEvent } from "./types";

const base: FamilyEvent = {
  id: "e1",
  title: "테스트",
  startDate: "2026-07-15",
  endDate: null,
  time: null,
  categoryId: "cat-together",
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

describe("layoutWeek — 연속 막대", () => {
  // 2026-07-05(일) ~ 07-11(토) 한 주
  const cols = [
    "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08",
    "2026-07-09", "2026-07-10", "2026-07-11",
  ];
  const all = cols.map(() => true);
  const item = (key: string, start: string, end: string): BarItem => ({
    key, start, end, color: "#000", label: key,
  });

  it("여러 날 일정은 한 막대로 이어진다", () => {
    const { bars } = layoutWeek([item("여행", "2026-07-07", "2026-07-09")], cols, all);
    expect(bars).toHaveLength(1);
    expect(bars[0].startCol).toBe(2);
    expect(bars[0].span).toBe(3);
    expect(bars[0].continuesLeft).toBe(false);
    expect(bars[0].continuesRight).toBe(false);
  });

  it("주 경계에서 잘리면 이어짐을 표시한다", () => {
    const { bars } = layoutWeek([item("장기", "2026-07-02", "2026-07-20")], cols, all);
    expect(bars[0].startCol).toBe(0);
    expect(bars[0].span).toBe(7);
    expect(bars[0].continuesLeft).toBe(true);
    expect(bars[0].continuesRight).toBe(true);
  });

  it("달 밖 칸에는 그리지 않는다 (첫 주 앞부분)", () => {
    // 07-01(수)이 첫날인 달의 첫 주: 앞 3칸(6/28~30)은 달 밖
    const inMonth = [false, false, false, true, true, true, true];
    const c = [
      "2026-06-28", "2026-06-29", "2026-06-30",
      "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04",
    ];
    const { bars } = layoutWeek([item("걸침", "2026-06-29", "2026-07-02")], c, inMonth);
    expect(bars[0].startCol).toBe(3);
    expect(bars[0].span).toBe(2);
    expect(bars[0].continuesLeft).toBe(true);
    expect(bars[0].continuesRight).toBe(false);
  });

  it("겹치면 다른 레인으로 내려가고, 안 겹치면 같은 레인을 재사용한다", () => {
    const { bars, laneCount } = layoutWeek(
      [
        item("A", "2026-07-05", "2026-07-07"),
        item("B", "2026-07-06", "2026-07-08"),
        item("C", "2026-07-09", "2026-07-09"),
      ],
      cols,
      all
    );
    const lane = (k: string) => bars.find((b) => b.key === k)!.lane;
    expect(lane("A")).toBe(0);
    expect(lane("B")).toBe(1);
    expect(lane("C")).toBe(0); // A와 겹치지 않으므로 같은 레인
    expect(laneCount).toBe(2);
  });

  it("긴 막대가 위 레인을 차지한다", () => {
    const { bars } = layoutWeek(
      [item("짧은", "2026-07-06", "2026-07-06"), item("긴", "2026-07-05", "2026-07-09")],
      cols,
      all
    );
    expect(bars.find((b) => b.key === "긴")!.lane).toBe(0);
    expect(bars.find((b) => b.key === "짧은")!.lane).toBe(1);
  });

  it("레인이 넘치면 해당 날짜에 +N으로 센다", () => {
    const items = ["1", "2", "3", "4", "5"].map((k) =>
      item(k, "2026-07-07", "2026-07-07")
    );
    const { bars, overflowByDate } = layoutWeek(items, cols, all, 3);
    expect(bars).toHaveLength(3);
    expect(overflowByDate.get("2026-07-07")).toBe(2);
  });

  it("주 밖 항목은 제외된다", () => {
    const { bars } = layoutWeek([item("다음주", "2026-07-13", "2026-07-14")], cols, all);
    expect(bars).toHaveLength(0);
  });
});
