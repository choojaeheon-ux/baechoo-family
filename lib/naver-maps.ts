// 네이버 지도 JS v3 동적 로더 — 스크립트를 1회만 주입하고 window.naver 준비를 기다린다
// 클라이언트 ID는 공개값(스크립트 URL에 노출)이며, NCP 콘솔에서 사용 도메인을 등록해야 동작한다.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NaverNS = any;

let loaderPromise: Promise<NaverNS> | null = null;

export function loadNaverMaps(): Promise<NaverNS> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("naver maps: window 없음 (SSR)"));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.naver?.maps) return Promise.resolve(w.naver);
  if (loaderPromise) return loaderPromise;

  const key = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  // 인증 실패(도메인 미등록·키 오류) 시 SDK가 호출하는 전역 콜백
  w.navermap_authFailure = () => {
    w.__naverAuthFailed = true;
  };
  loaderPromise = new Promise<NaverNS>((resolve, reject) => {
    if (!key) {
      reject(new Error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 미설정"));
      return;
    }
    const existing = document.getElementById("naver-maps-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve(w.naver));
      existing.addEventListener("error", () =>
        reject(new Error("naver maps 스크립트 로드 실패"))
      );
      return;
    }
    const s = document.createElement("script");
    s.id = "naver-maps-sdk";
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${key}`;
    s.async = true;
    s.onload = () => resolve(w.naver);
    s.onerror = () => reject(new Error("naver maps 스크립트 로드 실패"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}
