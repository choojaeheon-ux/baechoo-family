"use client";

import { useEffect, useState } from "react";

// 「N분 전」을 1분마다 다시 그린다. 렌더 중 Date.now()는 react-hooks/purity 위반이라 여기서만 읽는다.
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
