import { describe, it, expect } from "vitest";
import { vaccineNextDue, vaccineDone, VACCINE_INTERVAL_MONTHS } from "./vaccine";

describe("vaccineNextDue", () => {
  it("미접종이면 예정일이 없다", () => {
    expect(vaccineNextDue(null)).toBeNull();
  });

  it("최근 접종일 + 12개월", () => {
    expect(vaccineNextDue("2026-07-10")).toBe("2027-07-10");
  });

  it("윤년 2/29 접종은 다음 해 2/28로 클램프된다", () => {
    expect(vaccineNextDue("2024-02-29")).toBe("2025-02-28");
  });

  it("주기는 12개월이다", () => {
    expect(VACCINE_INTERVAL_MONTHS).toBe(12);
  });
});

describe("vaccineDone", () => {
  it("미접종이면 미완료다", () => {
    expect(vaccineDone(null, "2026-07-10")).toBe(false);
  });

  it("오늘 접종했으면 완료다", () => {
    expect(vaccineDone("2026-07-10", "2026-07-10")).toBe(true);
  });

  it("예정일이 아직 남았으면 완료다", () => {
    expect(vaccineDone("2026-01-01", "2026-07-10")).toBe(true);
  });

  it("예정일 당일이면 미완료다 — 오늘 맞아야 한다", () => {
    expect(vaccineDone("2025-07-10", "2026-07-10")).toBe(false);
  });

  it("예정일이 지났으면 미완료다", () => {
    expect(vaccineDone("2025-06-01", "2026-07-10")).toBe(false);
  });
});
