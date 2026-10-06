import { describe, it, expect } from "vitest";
import {
  quickMeal,
  quickWalk,
  quickStool,
  quickEtc,
  applyWalkRoute,
  recentAmounts,
  walkTimes,
  canEndNow,
  healthNextDate,
} from "./baechooQuick";
import { localMs } from "./baechooEvents";
import type { BaechooMeal, BaechooWalk } from "./types";

const meal = (p: Partial<BaechooMeal>): BaechooMeal => ({
  id: "m", date: "2026-10-01", mealType: "meal", time: "08:00",
  content: "", topping: null, amount: null, memo: null, ...p,
});
const now = new Date(2026, 9, 6, 8, 30); // 2026-10-06 08:30 KST

describe("quickMeal — 같은 구분의 직전 기록 전부 복사", () => {
  const meals = [
    meal({ id: "old", date: "2026-09-30", content: "로얄캐닌", topping: null, amount: "2/2" }),
    meal({ id: "prev", date: "2026-10-01", time: "18:00", content: "인섹트 프로틴", topping: "닭고기", amount: "1/1", memo: "잘 먹음" }),
    meal({ id: "snk", date: "2026-10-02", mealType: "snack", content: "육포", amount: "2" }),
  ];

  it("식사 버튼은 직전 식사의 사료·토핑·양을 복사하고 메모는 비운다", () => {
    const m = quickMeal(meals, "meal", now, "new");
    expect(m).toEqual({
      id: "new", date: "2026-10-06", mealType: "meal", time: "08:30",
      content: "인섹트 프로틴", topping: "닭고기", amount: "1/1", memo: null,
    });
  });

  it("식사 버튼은 더 최근의 간식을 복사하지 않는다", () => {
    expect(quickMeal(meals, "meal", now, "n").content).toBe("인섹트 프로틴");
  });

  it("간식 버튼은 직전 간식을 복사하고 토핑은 없다", () => {
    const s = quickMeal(meals, "snack", now, "n");
    expect([s.content, s.amount, s.topping]).toEqual(["육포", "2", null]);
  });

  it("직전 기록이 없으면 빈 기록", () => {
    const m = quickMeal([], "meal", now, "n");
    expect([m.content, m.topping, m.amount]).toEqual(["", null, null]);
  });
});

describe("나머지 원탭", () => {
  it("산책 = 지금 시작, 소요 0, 위치 없음", () => {
    const w = quickWalk(now, "w");
    expect([w.date, w.durationSec, w.route.length, w.stools.length]).toEqual(["2026-10-06", 0, 0, 0]);
    expect(new Date(w.startTime!).getTime()).toBe(now.getTime());
  });
  it("응가 = 정상", () => {
    expect(quickStool(now, "s")).toEqual({ id: "s", date: "2026-10-06", time: "08:30", state: "normal", memo: null });
  });
  it("기타 = 종류 기타, 내용 비움, 시각 있음", () => {
    expect(quickEtc(now, "h")).toEqual({
      id: "h", date: "2026-10-06", healthType: "etc", title: "", time: "08:30", nextDate: null, memo: null,
    });
  });
});

describe("applyWalkRoute — 위치는 저장 뒤에 도착한다(함수형 갱신으로 그 순간의 최신 목록에 적용)", () => {
  const w = quickWalk(now, "w");
  const pos = { lat: 37.39, lng: 126.95 };

  it("그 사이 되돌리기(삭제)된 산책은 목록에 되살리지 않는다", () => {
    const other: BaechooWalk = { ...w, id: "x" };
    expect(applyWalkRoute([other], "w", pos)).toEqual([other]);
  });
  it("이미 위치가 있으면 덮지 않는다", () => {
    const located: BaechooWalk = { ...w, route: [pos] };
    expect(applyWalkRoute([located], "w", { lat: 0, lng: 0 })).toEqual([located]);
  });
  it("그 사이 다른 탭에서 고친 끝난 시각·메모는 그대로 두고 위치만 더한다", () => {
    const edited: BaechooWalk = { ...w, durationSec: 1800, memo: "공원" };
    expect(applyWalkRoute([edited], "w", pos)).toEqual([{ ...edited, route: [pos] }]);
  });
});

describe("recentAmounts", () => {
  it("같은 구분의 최근 값부터 중복 없이 최대 4개", () => {
    const meals = [
      meal({ id: "1", date: "2026-10-01", amount: "1/1" }),
      meal({ id: "2", date: "2026-10-02", amount: "3/3" }),
      meal({ id: "3", date: "2026-10-03", amount: "1/1" }),
      meal({ id: "4", date: "2026-10-04", amount: null }),
      meal({ id: "5", date: "2026-10-05", mealType: "snack", amount: "2" }),
    ];
    expect(recentAmounts(meals, "meal")).toEqual(["1/1", "3/3"]);
  });
});

describe("walkTimes — 상세 시트 시각 → 저장 값", () => {
  it("끝이 시작보다 이르면 자정을 넘긴 것", () => {
    const t = walkTimes("2026-10-05", "23:50", "00:20");
    expect(t.durationSec).toBe(30 * 60);
    expect(new Date(t.startTime).getTime()).toBe(localMs("2026-10-05", "23:50"));
  });
  it("끝이 없으면 소요 0", () => {
    expect(walkTimes("2026-10-05", "07:30", null).durationSec).toBe(0);
  });
});

describe("canEndNow — 「지금 종료」는 진행 중일 법한 산책에만", () => {
  const start = localMs("2026-10-06", "07:30");
  it("시작 뒤 6시간 안이면 보인다", () => {
    expect(canEndNow(start, localMs("2026-10-06", "07:55"))).toBe(true);
    expect(canEndNow(start, localMs("2026-10-06", "13:30"))).toBe(true);
  });
  it("지난 기록(6시간 넘음)에는 안 보인다 — 실수로 엉뚱한 끝 시각이 들어가지 않게", () => {
    expect(canEndNow(start, localMs("2026-10-06", "13:31"))).toBe(false);
    expect(canEndNow(start, localMs("2026-10-09", "08:00"))).toBe(false);
  });
  it("시작이 지금보다 미래면 안 보인다", () => {
    expect(canEndNow(start, localMs("2026-10-06", "07:00"))).toBe(false);
  });
});

describe("healthNextDate — 건강 탭과 기타 시트가 같은 규칙으로 저장", () => {
  it("병원·예방접종·약·영양제만 다음 예정일을 남긴다", () => {
    expect(healthNextDate("hospital", "2026-11-01")).toBe("2026-11-01");
    expect(healthNextDate("supplement", "2026-11-01")).toBe("2026-11-01");
  });
  it("양치·기타 등에는 남기지 않는다 — 건강 탭에서 고칠 때 지워질 값을 만들지 않게", () => {
    expect(healthNextDate("dental", "2026-11-01")).toBeNull();
    expect(healthNextDate("etc", "2026-11-01")).toBeNull();
  });
  it("빈 칸은 null", () => {
    expect(healthNextDate("hospital", "")).toBeNull();
  });
});
