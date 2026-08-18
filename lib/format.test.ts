import { describe, it, expect } from "vitest";
import { addDays } from "./format";

describe("addDays", () => {
  it("월 경계·연 경계를 넘는다", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
