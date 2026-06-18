"use client";

import { useEffect, useRef, useState } from "react";
import { STOOL_STATE_LABEL, type LatLng, type Stool } from "@/lib/types";
import { loadNaverMaps } from "@/lib/naver-maps";
import { routeDistance, pawPoints } from "@/lib/geo";

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

// 강아지 발자국 아이콘 — 진행방향(bearing)으로 회전, 좌우 번갈아 오프셋
function pawIcon(naver: NaverNS, bearingDeg: number, side: number) {
  const nudge = side % 2 === 0 ? -3 : 3;
  return {
    content: `<div style="font-size:15px;line-height:1;transform:rotate(${bearingDeg}deg) translateX(${nudge}px);transform-origin:center;filter:drop-shadow(0 0 1px rgba(0,0,0,.35))">🐾</div>`,
    anchor: new naver.maps.Point(8, 8),
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
  currentPos: LatLng | null,
  pawTrail: boolean,
  fit: boolean
) {
  // 기존 오버레이 제거
  overlays.forEach((o) => o.setMap(null));
  overlays.length = 0;

  const path = route.map((p) => new naver.maps.LatLng(p.lat, p.lng));

  if (pawTrail && !live && path.length > 1) {
    // 저장본: 강아지 발자국 트레일
    // 흐린 점선 경로
    overlays.push(
      new naver.maps.Polyline({
        map,
        path,
        strokeColor: "#5b8c3e",
        strokeWeight: 3,
        strokeOpacity: 0.3,
        strokeStyle: "shortdash",
      })
    );
    // 발자국 (간격은 경로 길이에 비례, 최대 ~50개)
    const total = routeDistance(route);
    const interval = Math.max(14, total / 50);
    pawPoints(route, interval).forEach((p, i) => {
      overlays.push(
        new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(p.lat, p.lng),
          icon: pawIcon(naver, p.bearing, i),
          zIndex: 40,
        })
      );
    });
    // 출발(초록)·도착(빨강) 점
    overlays.push(
      new naver.maps.Marker({
        map,
        position: path[0],
        icon: dotIcon(naver, "#5b8c3e", 12),
        title: "출발",
        zIndex: 50,
      })
    );
    overlays.push(
      new naver.maps.Marker({
        map,
        position: path[path.length - 1],
        icon: dotIcon(naver, "#d9534f", 12),
        title: "도착",
        zIndex: 50,
      })
    );
  } else {
    // 라이브/일반: 실선 경로 + 출발점
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

  // fit=false면 사용자가 직접 맞춘 확대/이동을 유지 (응가 편집 등으로 재그릴 때)
  if (!fit) return;

  // 저장본: 전체가 보이게 맞춤 (최초 1회)
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
  pawTrail = false,
  className = "",
}: {
  route: LatLng[];
  stools?: Stool[];
  live?: boolean;
  currentPos?: LatLng | null;
  isStatic?: boolean;
  pawTrail?: boolean;
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const naverRef = useRef<NaverNS>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);
  const fittedRef = useRef(false);
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
          // 라이브가 아닌 인터랙티브 지도(상세·저장)에는 확대/축소 버튼 표시
          zoomControl: interactive && !live,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
            style: naver.maps.ZoomControlStyle.SMALL,
          },
        });
        mapRef.current = map;
        fittedRef.current = true;
        drawWalk(naver, map, overlaysRef.current, route, stools, live, currentPos, pawTrail, true);
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
      // 최초 1회만 화면 맞춤. 이후 갱신(응가 편집 등)은 사용자 확대/이동을 유지.
      const fit = !fittedRef.current;
      fittedRef.current = true;
      drawWalk(naver, map, overlaysRef.current, route, stools, live, currentPos, pawTrail, fit);
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
