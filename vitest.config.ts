import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // 배추 기록의 시각 계산은 로컬(한국) 시각 기준이다 — 테스트도 KST로 고정한다
    env: { TZ: "Asia/Seoul" },
  },
});
