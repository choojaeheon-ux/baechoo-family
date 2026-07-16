import { describe, it, expect } from "vitest";
import { CATEGORY_PALETTE, readableText } from "./eventCategoryPalette";

describe("readableText", () => {
  it("어두운 배경 → 흰 글씨", () => {
    expect(readableText("#5b8c3e")).toBe("#ffffff"); // leaf
    expect(readableText("#5c93a8")).toBe("#ffffff"); // sky
    expect(readableText("#e07a5f")).toBe("#ffffff"); // coral
  });
  it("밝은 배경 → 짙은 글씨", () => {
    expect(readableText("#d9a441")).toBe("#2f2a20"); // gold
    expect(readableText("#8ab560")).toBe("#2f2a20"); // sprout
    expect(readableText("#ffffff")).toBe("#2f2a20");
  });
  it("팔레트는 최소 10색, 전부 6자리 hex", () => {
    expect(CATEGORY_PALETTE.length).toBeGreaterThanOrEqual(10);
    for (const c of CATEGORY_PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});
