// 산책 원탭 — 누른 순간의 위치 한 점. 권한 거부·실패·시간 초과는 null(오류창 없음).
import type { LatLng } from "./types";

export function currentPosition(timeoutMs: number): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
    );
  });
}
