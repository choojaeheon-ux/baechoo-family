import { describe, it, expect } from "vitest";
import { toHealth, fromHealth, toStool, fromStool } from "./repo";

describe("건강 기록 시각(0028)", () => {
  it("time 칸이 없던 행(0028 전·옛 기록)은 시각 없음(null)으로 읽는다", () => {
    const h = toHealth({ id: "h1", date: "2026-07-01", health_type: "dental", title: "칫솔질" });
    expect(h.time).toBeNull();
  });

  it("시각은 읽고 다시 써도 그대로 남는다 — 건강 탭 수정이 시각을 지우지 않게", () => {
    const h = toHealth({ id: "h1", date: "2026-10-06", health_type: "etc", title: "", time: "08:30" });
    expect(fromHealth(h).time).toBe("08:30");
  });
});

describe("독립 응가(baechoo_stools)", () => {
  it("상태가 비어 있으면 정상으로 읽는다", () => {
    const s = toStool({ id: "s1", date: "2026-10-06", time: "07:10", state: null, memo: null });
    expect(s.state).toBe("normal");
  });

  it("읽고 다시 쓰면 같은 행이 된다", () => {
    const row = { id: "s1", date: "2026-10-06", time: "07:10", state: "loose", memo: "조금 묽음" };
    expect(fromStool(toStool(row))).toEqual(row);
  });
});
