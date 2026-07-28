import { describe, it, expect } from "vitest";
import {
  ATLAS_CELL_M,
  cellIndexOf,
  cellBounds,
  visitedCells,
  haversine,
} from "./geo";

// 신설동 인근 (배추 실제 산책 동네 스케일)
const BASE = { lat: 37.5744, lng: 127.0098 };

// 기준점에서 북/동으로 m만큼 이동한 좌표 (동네 스케일 근사)
function move(p: { lat: number; lng: number }, northM: number, eastM: number) {
  const lat = p.lat + northM / 111320;
  const lng = p.lng + eastM / (111320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat, lng };
}

describe("cellIndexOf", () => {
  it("같은 칸 안의 두 점은 같은 인덱스", () => {
    const a = cellBounds(cellIndexOf(BASE).gx, cellIndexOf(BASE).gy);
    // 칸 중심 근처의 두 점
    const c1 = { lat: (a.south + a.north) / 2, lng: (a.west + a.east) / 2 };
    const c2 = move(c1, 5, 5);
    expect(cellIndexOf(c1)).toEqual(cellIndexOf(c2));
  });

  it("60m 북쪽 점은 다른 행(gy)", () => {
    const b = move(BASE, 60, 0);
    expect(cellIndexOf(b).gy).not.toBe(cellIndexOf(BASE).gy);
  });
});

describe("cellBounds", () => {
  it("점이 속한 칸의 경계가 그 점을 포함한다", () => {
    const { gx, gy } = cellIndexOf(BASE);
    const b = cellBounds(gx, gy);
    expect(BASE.lat).toBeGreaterThanOrEqual(b.south);
    expect(BASE.lat).toBeLessThan(b.north);
    expect(BASE.lng).toBeGreaterThanOrEqual(b.west);
    expect(BASE.lng).toBeLessThan(b.east);
  });

  it("서울 위도에서 칸의 실제 폭·높이 ≈ 50m", () => {
    const { gx, gy } = cellIndexOf(BASE);
    const b = cellBounds(gx, gy);
    const midLat = (b.south + b.north) / 2;
    const width = haversine(
      { lat: midLat, lng: b.west },
      { lat: midLat, lng: b.east }
    );
    const midLng = (b.west + b.east) / 2;
    const height = haversine(
      { lat: b.south, lng: midLng },
      { lat: b.north, lng: midLng }
    );
    expect(width).toBeGreaterThan(ATLAS_CELL_M - 1);
    expect(width).toBeLessThan(ATLAS_CELL_M + 1);
    expect(height).toBeGreaterThan(ATLAS_CELL_M - 1);
    expect(height).toBeLessThan(ATLAS_CELL_M + 1);
  });
});

describe("visitedCells", () => {
  it("빈 입력 → 빈 배열", () => {
    expect(visitedCells([])).toEqual([]);
    expect(visitedCells([[]])).toEqual([]);
  });

  it("점 하나 → 칸 하나", () => {
    expect(visitedCells([[BASE]])).toHaveLength(1);
  });

  it("점이 성긴 직선 200m도 중간 칸을 건너뛰지 않는다", () => {
    // 끝점 2개뿐인 세그먼트 — 보간 없으면 2칸만 나온다
    const route = [BASE, move(BASE, 200, 0)];
    const cells = visitedCells([route]);
    // 200m / 50m = 최소 4~5개 행을 연속으로 지나야 함
    expect(cells.length).toBeGreaterThanOrEqual(4);
    const rows = cells.map((c) => c.gy).sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i] - rows[i - 1]).toBe(1); // 연속(구멍 없음)
    }
  });

  it("같은 길을 두 번 걸어도 칸은 중복되지 않는다", () => {
    const route = [BASE, move(BASE, 200, 0)];
    const once = visitedCells([route]);
    const twice = visitedCells([route, [...route].reverse()]);
    expect(twice).toHaveLength(once.length);
  });
});
