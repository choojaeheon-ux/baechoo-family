import { describe, it, expect } from "vitest";
import { CATEGORY_PALETTE } from "./categoryPalette";

describe("카테고리 팔레트", () => {
  it("팔레트는 최소 10색, 전부 6자리 hex", () => {
    expect(CATEGORY_PALETTE.length).toBeGreaterThanOrEqual(10);
    for (const c of CATEGORY_PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});
