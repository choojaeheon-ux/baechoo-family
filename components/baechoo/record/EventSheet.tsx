"use client";

import { useData } from "@/lib/data-context";
import type { EventSource } from "@/lib/baechooEvents";
import { MealSheet, WalkSheet, StoolSheet, EtcSheet } from "./sheets";

// 기록을 누르면 원본을 다시 찾아 맞는 시트를 연다. 원본이 없으면(다른 기기에서 삭제 등) 그리지 않는다.
// 호출부는 조건부 마운트 + key={`${table}:${id}`} — 시트의 useState 초기값이 다른 기록에 고착되지 않게.
export default function EventSheet({ source, onClose }: { source: EventSource; onClose: () => void }) {
  const { baechooMeals, baechooWalks, baechooStools, baechooHealth } = useData();
  if (source.table === "meal") {
    const m = baechooMeals.find((x) => x.id === source.id);
    return m ? <MealSheet meal={m} onClose={onClose} /> : null;
  }
  if (source.table === "walk") {
    const w = baechooWalks.find((x) => x.id === source.id);
    return w ? <WalkSheet walk={w} onClose={onClose} /> : null;
  }
  if (source.table === "stool") {
    const s = baechooStools.find((x) => x.id === source.id);
    return s ? <StoolSheet stool={s} onClose={onClose} /> : null;
  }
  const h = baechooHealth.find((x) => x.id === source.id);
  return h ? <EtcSheet health={h} onClose={onClose} /> : null;
}
