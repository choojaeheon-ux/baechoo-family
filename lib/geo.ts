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
