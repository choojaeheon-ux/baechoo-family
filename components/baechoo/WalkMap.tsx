"use client";

import { useEffect, useRef, useState } from "react";
import { STOOL_STATE_LABEL, type LatLng, type Stool } from "@/lib/types";
import { loadNaverMaps } from "@/lib/naver-maps";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NaverNS = any;

// 응가 상태별 마커 색
const STOOL_COLOR: Record<string, string> = {
  normal: "#5b8c3e",
  oily: "#d9a441",
  loose: "#e08a3c",
  diarrhea: "#d9534f",
  watery: "#4a90d9",
  fail: "#9aa0a6",
};

// 색 점 마커 아이콘 (HTML)
function dotIcon(naver: NaverNS, color: string, size: number) {
  const half = size / 2;
  return {
    content: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15)"></div>`,
    anchor: new naver.maps.Point(half + 2, half + 2),
  };
}

function drawWalk(
  naver: NaverNS,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overlays: any[],
  route: LatLng[],
  stools: Stool[],
  live: boolean,
  currentPos: LatLng | null
) {
  // 기존 오버레이 제거
  overlays.forEach((o) => o.setMap(null));
  overlays.length = 0;

  const path = route.map((p) => new naver.maps.LatLng(p.lat, p.lng));

  if (path.length > 1) {
    overlays.push(
      new naver.maps.Polyline({
        map,
        path,
        strokeColor: "#5b8c3e",
        strokeWeight: 4,
        strokeOpacity: 0.85,
      })
    );
  }
  // 출발점
  if (path.length > 0) {
    overlays.push(
      new naver.maps.Marker({
        map,
        position: path[0],
        icon: dotIcon(naver, "#5b8c3e", 12),
        zIndex: 50,
      })
    );
  }
  // 응가 마커 (위치 있는 것만)
  const stoolPts: LatLng[] = [];
  for (const s of stools) {
    if (s.lat == null || s.lng == null) continue;
    stoolPts.push({ lat: s.lat, lng: s.lng });
    overlays.push(
      new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(s.lat, s.lng),
        icon: dotIcon(naver, STOOL_COLOR[s.state] ?? "#9aa0a6", 14),
        title: STOOL_STATE_LABEL[s.state],
        zIndex: 60,
      })
    );
  }

  if (live && currentPos) {
    // 추적 중 현재 위치
    const cur = new naver.maps.LatLng(currentPos.lat, currentPos.lng);
    overlays.push(
      new naver.maps.Marker({
        map,
        position: cur,
        icon: dotIcon(naver, "#4a90d9", 16),
        zIndex: 100,
      })
    );
    map.setCenter(cur);
    if (map.getZoom() < 15) map.setZoom(16);
    return;
  }

  // 저장본: 전체가 보이게 맞춤
  const all = [
    ...route,
    ...stoolPts,
  ];
  if (all.length > 1) {
    const bounds = new naver.maps.LatLngBounds(
      new naver.maps.LatLng(all[0].lat, all[0].lng),
      new naver.maps.LatLng(all[0].lat, all[0].lng)
    );
    all.forEach((p) => bounds.extend(new naver.maps.LatLng(p.lat, p.lng)));
    map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
  } else if (all.length === 1) {
    map.setCenter(new naver.maps.LatLng(all[0].lat, all[0].lng));
    map.setZoom(16);
  }
}

export default function WalkMap({
  route,
  stools = [],
  live = false,
  currentPos = null,
  isStatic = false,
  className = "",
}: {
  route: LatLng[];
  stools?: Stool[];
  live?: boolean;
  currentPos?: LatLng | null;
  isStatic?: boolean;
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const naverRef = useRef<NaverNS>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);
  const [failed, setFailed] = useState(false);

  // 지도 초기화 (마운트 1회)
  useEffect(() => {
    if (typeof window === "undefined" || !divRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const naver = await loadNaverMaps();
        // 인증 실패(도메인 미등록 등) 시 SDK 전역 플래그 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).__naverAuthFailed) throw new Error("naver auth 실패");
        if (cancelled || !divRef.current || mapRef.current) return;
        naverRef.current = naver;
        const interactive = !isStatic;
        const map = new naver.maps.Map(divRef.current, {
          center: new naver.maps.LatLng(37.5665, 126.978), // 서울 기본값
          zoom: 15,
          draggable: interactive,
          pinchZoom: interactive,
          scrollWheel: interactive,
          keyboardShortcuts: interactive,
          disableDoubleClickZoom: !interactive,
          disableDoubleTapZoom: !interactive,
          mapDataControl: false,
          scaleControl: false,
          logoControl: true,
          zoomControl: false,
        });
        mapRef.current = map;
        drawWalk(naver, map, overlaysRef.current, route, stools, live, currentPos);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      try {
        overlaysRef.current.forEach((o) => o.setMap(null));
        mapRef.current?.destroy?.();
      } catch {
        /* 인증 실패로 깨진 맵 정리 시 예외 무시 */
      }
      overlaysRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 경로/응가/현재위치 변경 시 갱신
  useEffect(() => {
    const map = mapRef.current;
    const naver = naverRef.current;
    if (!map || !naver) return;
    try {
      drawWalk(naver, map, overlaysRef.current, route, stools, live, currentPos);
    } catch {
      setFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, stools, currentPos, live]);

  if (failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-cream text-center text-xs text-stone`}
      >
        지도를 불러오지 못했어요
      </div>
    );
  }

  return (
    <div
      ref={divRef}
      className={`${className} ${isStatic ? "pointer-events-none" : ""}`}
    />
  );
}
