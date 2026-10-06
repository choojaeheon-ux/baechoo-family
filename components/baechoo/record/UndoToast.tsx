"use client";

import { useEffect } from "react";

export interface ToastState {
  id: number;
  text: string;
  undo: (() => Promise<void>) | null;
}

// 원탭 직후 4초 동안 「되돌리기」. 되돌리기 = 그 기록 소프트삭제(휴지통).
export default function UndoToast({ toast, onDone }: { toast: ToastState | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
    >
      <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-ink/90 px-5 py-3 text-[15px] text-white shadow-lg backdrop-blur">
        <span>{toast.text}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={async () => {
              const undo = toast.undo;
              onDone();
              await undo?.();
            }}
            className="font-semibold text-sprout"
          >
            되돌리기
          </button>
        )}
      </div>
    </div>
  );
}
