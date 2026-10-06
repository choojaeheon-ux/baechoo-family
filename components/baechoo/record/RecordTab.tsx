"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import { newId } from "@/lib/repo";
import type { BaechooWalk } from "@/lib/types";
import { KIND_LABEL, dateOf, type EventKind, type EventSource } from "@/lib/baechooEvents";
import { quickMeal, quickWalk, quickStool, quickEtc, patchWalkLocation } from "@/lib/baechooQuick";
import { currentPosition } from "@/lib/geoOnce";
import { useNow } from "./useNow";
import { useBaechooEvents } from "./useBaechooEvents";
import QuickButtons from "./QuickButtons";
import LastCards from "./LastCards";
import Timeline from "./Timeline";
import UndoToast, { type ToastState } from "./UndoToast";
import EventSheet from "./EventSheet";

export default function RecordTab() {
  const {
    baechooMeals,
    baechooWalks,
    saveBaechooMeal,
    removeBaechooMeal,
    saveBaechooWalk,
    removeBaechooWalk,
    saveBaechooStool,
    removeBaechooStool,
    saveBaechooHealth,
    removeBaechooHealth,
  } = useData();
  const events = useBaechooEvents();
  const now = useNow();
  const [busy, setBusy] = useState<EventKind[]>([]);
  // 버튼별 잠금 — state만으론 연타를 못 막는다(같은 틱의 두 번째 클릭은 옛 state를 본다).
  // 산책은 위치를 기다리는 동안 잠기지만 다른 버튼(산책 중 응가)은 그대로 눌린다.
  const locks = useRef(new Set<EventKind>());
  // 위치 덧쓰기는 몇 초 뒤라 그 사이 삭제·편집을 반영한 최신 목록을 봐야 한다
  const walksRef = useRef<BaechooWalk[]>(baechooWalks);
  useEffect(() => {
    walksRef.current = baechooWalks;
  }, [baechooWalks]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [open, setOpen] = useState<EventSource | null>(null);

  async function press(kind: EventKind) {
    if (locks.current.has(kind)) return;
    locks.current.add(kind);
    setBusy((b) => [...b, kind]);
    const at = new Date();
    const id = newId();
    const toastId = at.getTime();
    try {
      if (kind === "meal" || kind === "snack") {
        await saveBaechooMeal(quickMeal(baechooMeals, kind, at, id));
        setToast({ id: toastId, text: `${KIND_LABEL[kind]} 기록됨`, undo: () => removeBaechooMeal(id) });
      } else if (kind === "stool") {
        await saveBaechooStool(quickStool(at, id));
        setToast({ id: toastId, text: "응가 기록됨", undo: () => removeBaechooStool(id) });
      } else if (kind === "etc") {
        await saveBaechooHealth(quickEtc(at, id));
        setToast({ id: toastId, text: "기타 기록됨", undo: () => removeBaechooHealth(id) });
      } else {
        await saveBaechooWalk(quickWalk(at, id));
        setToast({ id: toastId, text: "산책 기록됨 · 위치 찾는 중", undo: () => removeBaechooWalk(id) });
        const pos = await currentPosition(10_000);
        const patched = pos ? patchWalkLocation(walksRef.current, id, pos) : null;
        if (patched) await saveBaechooWalk(patched);
        setToast((t) =>
          t && t.id === toastId ? { ...t, text: patched ? "산책 기록됨" : "산책 기록됨 · 위치 없음" } : t
        );
      }
    } finally {
      locks.current.delete(kind);
      setBusy((b) => b.filter((k) => k !== kind));
    }
  }

  return (
    <div className="pb-4">
      <QuickButtons onPress={press} busy={busy} />
      <div className="mt-5">
        <LastCards events={events} now={now} />
      </div>
      <div className="mt-6">
        <Timeline events={events} today={dateOf(now)} onOpen={setOpen} />
      </div>
      {open && (
        <EventSheet key={`${open.table}:${open.id}`} source={open} onClose={() => setOpen(null)} />
      )}
      <UndoToast toast={toast} onDone={clearToast} />
    </div>
  );
}
