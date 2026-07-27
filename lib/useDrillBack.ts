"use client";

import { useCallback, useEffect, useRef } from "react";

// 드릴다운(목록 → 걸러진 목록)에 브라우저 뒤로가기를 붙인다.
//
// 서브탭은 useState라 히스토리에 안 남는다. 그래서 대시보드에서 계정 과목을 눌러
// 거래내역으로 넘어간 뒤 뒤로가기(iOS 스와이프)를 하면 직전 화면이 아니라
// 직전 "라우트"(캘린더·손익 등 다른 하단 탭)로 튕겨 나갔다.
// 드릴다운 시점에 히스토리 엔트리를 하나 쌓아 두면 그 뒤로가기가 여기서 소비된다.
//
// 서브탭을 손으로 옮기는 건 일부러 쌓지 않는다 — 탭을 몇 번 눌렀는지만큼
// 뒤로가기를 눌러야 앱을 벗어나게 되는 게 더 불편하기 때문.
export function useDrillBack(onBack: () => void) {
  const armedRef = useRef(false);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    const handle = () => {
      // 우리가 쌓은 엔트리가 아니면 진짜 라우트 이동이다 — 건드리지 않는다
      if (!armedRef.current) return;
      armedRef.current = false;
      onBackRef.current();
    };
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);

  // 드릴다운으로 들어갈 때 호출. 이미 쌓여 있으면 더 쌓지 않는다
  // (과목을 연달아 바꿔 눌러도 뒤로가기 한 번이면 원래 화면으로 돌아가야 하므로).
  return useCallback(() => {
    if (armedRef.current) return;
    armedRef.current = true;
    // URL은 그대로 둔다 — 홈 화면에 설치된 PWA라 주소가 안 보이고,
    // 쿼리를 붙이면 새로고침했을 때 화면과 URL이 어긋난다.
    window.history.pushState(null, "", window.location.href);
  }, []);
}
