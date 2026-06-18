"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { todayISO, nowHHMM } from "@/lib/format";
import {
  haversine,
  routeDistance,
  formatDuration,
  formatDistance,
} from "@/lib/geo";
import {
  STOOL_STATES,
  STOOL_STATE_LABEL,
  type StoolState,
  type LatLng,
  type Stool,
} from "@/lib/types";
import WalkMap from "./WalkMap";
import { WalkSaveSheet, type WalkDraft } from "./walk-forms";

export default function WalkTracker({ onClose }: { onClose: () => void }) {
  const [route, setRoute] = useState<LatLng[]>([]);
  const [stools, setStools] = useState<Stool[]>([]);
  const [elapsed, setElapsed] = useState(0); // 초
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<WalkDraft | null>(null);

  const startTimeRef = useRef<string | null>(null);
  const startDateRef = useRef<string>(todayISO());
  const startMsRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null);

  const distanceM = useMemo(() => routeDistance(route), [route]);

  // 추적 시작 (마운트)
  useEffect(() => {
    startTimeRef.current = new Date().toISOString();
    startDateRef.current = todayISO();
    startMsRef.current = Date.now();

    // 화면 켜두기
    const requestWakeLock = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (nav.wakeLock?.request) {
          wakeLockRef.current = await nav.wakeLock.request("screen");
        }
      } catch {
        /* 무시 */
      }
    };
    requestWakeLock();
    const onVisible = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);

    // 타이머
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMsRef.current) / 1000));
    }, 1000);

    // GPS 추적
    if (!("geolocation" in navigator)) {
      setError("이 기기에서 위치 기능을 쓸 수 없어요.");
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const p = { lat: latitude, lng: longitude };
          setCurrentPos(p);
          setError(null);
          // 정확도 낮은 좌표는 경로에 반영하지 않음
          if (accuracy != null && accuracy > 50) return;
          setRoute((prev) => {
            const last = prev[prev.length - 1];
            // 5m 미만 이동은 지터로 보고 무시
            if (last && haversine(last, p) < 5) return prev;
            return [...prev, p];
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setError(
              "위치 권한이 거부됐어요. 브라우저 설정에서 위치를 허용해 주세요."
            );
          } else {
            setError("위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
    }

    return () => {
      if (watchIdRef.current != null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      try {
        wakeLockRef.current?.release?.();
      } catch {
        /* 무시 */
      }
    };
  }, []);

  function addStool(state: StoolState) {
    setStools((prev) => [
      ...prev,
      {
        state,
        time: nowHHMM(),
        lat: currentPos?.lat ?? null,
        lng: currentPos?.lng ?? null,
      },
    ]);
    setPicking(false);
  }

  function finish() {
    if (watchIdRef.current != null)
      navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setDraft({
      date: startDateRef.current,
      startTime: startTimeRef.current,
      durationSec: elapsed,
      distanceM,
      route,
      stools,
    });
  }

  // 저장 시트가 열리면 추적 화면 위에 표시
  if (draft) {
    return (
      <WalkSaveSheet open onClose={onClose} draft={draft} />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-cream">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-bold text-ink">산책 중</span>
        <button
          onClick={onClose}
          className="text-sm text-stone"
          aria-label="취소"
        >
          취소
        </button>
      </div>

      {/* 통계 */}
      <div className="flex items-end justify-center gap-6 px-4 pb-3">
        <div className="text-center">
          <p className="text-[11px] text-stone">소요</p>
          <p className="text-3xl font-extrabold tabular-nums text-ink">
            {formatDuration(elapsed)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-stone">거리</p>
          <p className="text-3xl font-extrabold tabular-nums text-ink">
            {formatDistance(distanceM)}
          </p>
        </div>
      </div>

      {/* 지도 */}
      <div className="relative flex-1">
        <WalkMap
          route={route}
          stools={stools}
          live
          currentPos={currentPos}
          className="h-full w-full"
        />
        {error && (
          <div className="absolute left-3 right-3 top-3 rounded-xl bg-coral-light px-3 py-2 text-xs font-semibold text-coral shadow">
            {error}
          </div>
        )}
        {!error && !currentPos && (
          <div className="absolute left-3 right-3 top-3 rounded-xl bg-card/90 px-3 py-2 text-xs text-stone shadow">
            위치를 찾는 중… 산책 중에는 앱을 켜둔 채로 두세요.
          </div>
        )}
      </div>

      {/* 응가 카운트 */}
      {stools.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pt-2">
          {stools.map((s, i) => (
            <span
              key={i}
              className="rounded-full bg-leaf-light px-2 py-0.5 text-[11px] font-semibold text-leaf-dark"
            >
              {STOOL_STATE_LABEL[s.state]} {s.time}
            </span>
          ))}
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="px-4 pb-8 pt-3">
        {picking ? (
          <div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              {STOOL_STATES.map((st) => (
                <button
                  key={st}
                  onClick={() => addStool(st)}
                  className="rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink active:scale-[0.98]"
                >
                  {STOOL_STATE_LABEL[st]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPicking(false)}
              className="w-full py-2 text-sm text-stone"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setPicking(true)}
              className="flex-1 rounded-xl border border-leaf bg-leaf-light/50 py-3.5 text-sm font-bold text-leaf-dark active:scale-[0.98]"
            >
              응가
            </button>
            <button
              onClick={finish}
              className="flex-1 rounded-xl bg-leaf py-3.5 text-sm font-bold text-white active:scale-[0.98]"
            >
              종료
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
