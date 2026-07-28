"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import { loadNaverMaps } from "@/lib/naver-maps";
import {
  visitedCells,
  cellBounds,
  formatDistance,
  formatDuration,
  haversine,
  routeDistance,
  pawPoints,
} from "@/lib/geo";
import { pawIcon } from "./WalkMap";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NaverNS = any;

// 50m×50m 칸 = 2,500㎡ ≈ 756평
const PYEONG_PER_CELL = 756;

// 전체 발자국 마커 상한 — 누적 거리에 따라 간격을 자동으로 벌려 성능 유지
const MAX_PAWS = 1200;

export default function WalkAtlas({ onClose }: { onClose: () => void }) {
  const { baechooWalks } = useData();
  const [territory, setTerritory] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const divRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const naverRef = useRef<NaverNS>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rectsRef = useRef<any[]>([]);

  // GPS 경로가 있는 산책만 지도에 그림 (수동 입력은 통계에만 포함)
  const routes = useMemo(
    () => baechooWalks.filter((w) => w.route.length > 1).map((w) => w.route),
    [baechooWalks]
  );
  const cells = useMemo(() => visitedCells(routes), [routes]);
  const stats = useMemo(
    () => ({
      count: baechooWalks.length,
      distanceM: baechooWalks.reduce((s, w) => s + w.distanceM, 0),
      durationSec: baechooWalks.reduce((s, w) => s + w.durationSec, 0),
    }),
    [baechooWalks]
  );

  // 지도 초기화 + 누적 경로 (마운트 1회)
  useEffect(() => {
    if (typeof window === "undefined" || !divRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const naver = await loadNaverMaps();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).__naverAuthFailed) throw new Error("naver auth 실패");
        if (cancelled || !divRef.current || mapRef.current) return;
        naverRef.current = naver;
        const map = new naver.maps.Map(divRef.current, {
          center: new naver.maps.LatLng(37.5665, 126.978),
          zoom: 15,
          mapDataControl: false,
          scaleControl: false,
          logoControl: true,
          zoomControl: false,
        });
        mapRef.current = map;

        // 누적 발자국 트레일 — 지도의 초록 녹지와 구분되게 어두운 톤(저장 산책과 같은 🐾 스타일)
        // 흐린 점선이 깔리고, 겹치는 단골길일수록 진해진다
        const totalM = routes.reduce((s, r) => s + routeDistance(r), 0);
        const interval = Math.max(14, totalM / MAX_PAWS);
        for (const route of routes) {
          overlaysRef.current.push(
            new naver.maps.Polyline({
              map,
              path: route.map((p) => new naver.maps.LatLng(p.lat, p.lng)),
              strokeColor: "#2f2a20",
              strokeWeight: 3,
              strokeOpacity: 0.25,
              strokeStyle: "shortdash",
            })
          );
          pawPoints(route, interval).forEach((p, i) => {
            overlaysRef.current.push(
              new naver.maps.Marker({
                map,
                position: new naver.maps.LatLng(p.lat, p.lng),
                icon: pawIcon(naver, p.bearing, i),
                zIndex: 40,
              })
            );
          });
        }

        // 주 산책 동네에 맞춤 — 여행지 산책(원거리)이 초기 화면을 전국으로 벌리지 않게
        // 중앙값 좌표에서 3km 안의 점들만 fitBounds 대상으로 삼는다.
        const all = routes.flat();
        if (all.length > 1) {
          const median = (xs: number[]) => {
            const s = [...xs].sort((a, b) => a - b);
            return s[Math.floor(s.length / 2)];
          };
          const center = {
            lat: median(all.map((p) => p.lat)),
            lng: median(all.map((p) => p.lng)),
          };
          const near = all.filter((p) => haversine(center, p) < 3000);
          const pts = near.length > 1 ? near : all;
          const bounds = new naver.maps.LatLngBounds(
            new naver.maps.LatLng(pts[0].lat, pts[0].lng),
            new naver.maps.LatLng(pts[0].lat, pts[0].lng)
          );
          pts.forEach((p) =>
            bounds.extend(new naver.maps.LatLng(p.lat, p.lng))
          );
          map.fitBounds(bounds, { top: 24, right: 24, bottom: 48, left: 24 });
        }
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      try {
        overlaysRef.current.forEach((o) => o.setMap(null));
        rectsRef.current.forEach((o) => o.setMap(null));
        mapRef.current?.destroy?.();
      } catch {
        /* 인증 실패로 깨진 맵 정리 시 예외 무시 */
      }
      overlaysRef.current = [];
      rectsRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정복 격자 토글 — 최초 켤 때 생성, 이후엔 붙였다 뗐다
  useEffect(() => {
    const map = mapRef.current;
    const naver = naverRef.current;
    if (!map || !naver || !ready) return;
    if (territory && rectsRef.current.length === 0) {
      rectsRef.current = cells.map((c) => {
        const b = cellBounds(c.gx, c.gy);
        return new naver.maps.Rectangle({
          map,
          bounds: new naver.maps.LatLngBounds(
            new naver.maps.LatLng(b.south, b.west),
            new naver.maps.LatLng(b.north, b.east)
          ),
          fillColor: "#5b8c3e",
          fillOpacity: 0.22,
          strokeOpacity: 0,
          strokeWeight: 1,
          clickable: false,
        });
      });
    } else {
      rectsRef.current.forEach((r) => r.setMap(territory ? map : null));
    }
  }, [territory, ready, cells]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-cream">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-bold text-ink">🗺️ 배추 산책 대동여지도</span>
        <button onClick={onClose} className="text-sm text-stone" aria-label="닫기">
          닫기
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-1 px-4 pb-3">
        <div className="text-center">
          <p className="text-[11px] text-stone">산책</p>
          <p className="text-sm font-extrabold tabular-nums text-ink">
            {stats.count}회
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-stone">거리</p>
          <p className="text-sm font-extrabold tabular-nums text-ink">
            {formatDistance(stats.distanceM)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-stone">시간</p>
          <p className="text-sm font-extrabold tabular-nums text-ink">
            {formatDuration(stats.durationSec)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-stone">정복한 땅</p>
          <p className="text-sm font-extrabold tabular-nums text-ink">
            {cells.length}칸
          </p>
          <p className="text-[10px] text-stone">
            약 {(cells.length * PYEONG_PER_CELL).toLocaleString()}평
          </p>
        </div>
      </div>

      {/* 지도 */}
      <div className="relative flex-1">
        {failed ? (
          <div className="flex h-full items-center justify-center text-xs text-stone">
            지도를 불러오지 못했어요
          </div>
        ) : (
          <div ref={divRef} className="h-full w-full" />
        )}
        {!failed && (
          <button
            onClick={() => setTerritory((v) => !v)}
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold shadow-md active:scale-[0.97] ${
              territory
                ? "bg-leaf text-white"
                : "border border-leaf bg-card text-leaf-dark"
            }`}
          >
            {territory ? "🏴 영토 끄기" : "🏴 영토 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
