import type { LatLng } from "./types";

const R = 6371000; // 지구 반지름 (m)

// 두 좌표 사이 거리 (m) — Haversine
export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 경로 전체 거리 (m)
export function routeDistance(route: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < route.length; i++) sum += haversine(route[i - 1], route[i]);
  return sum;
}

// 두 좌표 사이 방위각 (북=0, 시계방향 도) — 발자국 회전용
export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// 경로를 일정 간격(m)으로 샘플링해 발자국 위치·진행방향 반환
export function pawPoints(
  route: LatLng[],
  intervalM: number
): { lat: number; lng: number; bearing: number }[] {
  if (route.length < 2) return [];
  const cum = [0];
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i - 1] + haversine(route[i - 1], route[i]));
  }
  const total = cum[cum.length - 1];
  if (total === 0) return [];
  const out: { lat: number; lng: number; bearing: number }[] = [];
  let seg = 1;
  for (let d = Math.min(intervalM * 0.5, total); d <= total; d += intervalM) {
    while (seg < route.length - 1 && cum[seg] < d) seg++;
    const a = route[seg - 1];
    const b = route[seg];
    const segLen = cum[seg] - cum[seg - 1] || 1;
    const t = (d - cum[seg - 1]) / segLen;
    out.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
      bearing: bearing(a, b),
    });
  }
  return out;
}

// ── 대동여지도 정복 격자 ──
// 지도를 50m×50m 칸으로 나누고, 경로가 지나간 칸을 구한다.
// 위도 스텝은 고정, 경도 스텝은 그 행(row) 중심 위도의 cos 기반이라
// 같은 행 안에서 칸이 정렬된다(인접 행 간 폭 차이는 동네 스케일에서 무시 가능).

export const ATLAS_CELL_M = 50;
const M_PER_DEG = 111320; // 위도 1도 ≈ 111.32km
const LAT_STEP = ATLAS_CELL_M / M_PER_DEG;

function lngStepAtRow(gy: number): number {
  const centerLat = (gy + 0.5) * LAT_STEP;
  return LAT_STEP / Math.cos((centerLat * Math.PI) / 180);
}

export function cellIndexOf(p: LatLng): { gx: number; gy: number } {
  const gy = Math.floor(p.lat / LAT_STEP);
  const gx = Math.floor(p.lng / lngStepAtRow(gy));
  return { gx, gy };
}

export function cellBounds(
  gx: number,
  gy: number
): { south: number; west: number; north: number; east: number } {
  const step = lngStepAtRow(gy);
  return {
    south: gy * LAT_STEP,
    north: (gy + 1) * LAT_STEP,
    west: gx * step,
    east: (gx + 1) * step,
  };
}

// 경로들이 지나간 칸 목록 (중복 제거).
// GPS 점 사이가 성겨도 칸을 건너뛰지 않도록 세그먼트를 sampleM 간격으로 보간.
export function visitedCells(
  routes: LatLng[][],
  sampleM = ATLAS_CELL_M / 2
): { gx: number; gy: number }[] {
  const seen = new Map<string, { gx: number; gy: number }>();
  const add = (p: LatLng) => {
    const c = cellIndexOf(p);
    const k = `${c.gx},${c.gy}`;
    if (!seen.has(k)) seen.set(k, c);
  };
  for (const route of routes) {
    if (route.length === 0) continue;
    add(route[0]);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1];
      const b = route[i];
      const n = Math.max(1, Math.ceil(haversine(a, b) / sampleM));
      for (let j = 1; j <= n; j++) {
        add({
          lat: a.lat + ((b.lat - a.lat) * j) / n,
          lng: a.lng + ((b.lng - a.lng) * j) / n,
        });
      }
    }
  }
  return [...seen.values()];
}

// 소요시간 표기 — 1:23:45 / 23:45
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

// 거리 표기 — 1.23km / 320m
export function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)}km`;
  return `${Math.round(m)}m`;
}
