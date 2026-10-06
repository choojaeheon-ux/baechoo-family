"use client";

import { useCallback, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import { newId } from "@/lib/repo";
import { KIND_LABEL, dateOf, type EventKind, type EventSource } from "@/lib/baechooEvents";
import { quickMeal, quickWalk, quickStool, quickEtc } from "@/lib/baechooQuick";
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
    saveBaechooMeal,
    removeBaechooMeal,
    saveBaechooWalk,
    removeBaechooWalk,
    patchBaechooWalkRoute,
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
        // 위치는 몇 초 뒤 — 그 사이 되돌리기·탭 이동·상세 편집이 있어도 컨텍스트가 최신 상태에 적용한다
        const pos = await currentPosition(10_000);
        if (pos) await patchBaechooWalkRoute(id, pos);
        setToast((t) =>
          t && t.id === toastId ? { ...t, text: pos ? "산책 기록됨" : "산책 기록됨 · 위치 없음" } : t
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
