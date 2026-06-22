"use client";

import { useEffect, useState } from "react";
import { useData } from "@/lib/data-context";
import {
  loadBaechooTrash,
  restoreBaechoo,
  hardDeleteBaechoo,
  type TrashItem,
} from "@/lib/repo";
import { Sheet, Empty } from "@/components/budget/ui";

export default function TrashSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { refresh } = useData();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setItems(await loadBaechooTrash());
  }

  useEffect(() => {
    if (open) {
      setItems(null);
      setConfirmId(null);
      load();
    }
  }, [open]);

  async function onRestore(it: TrashItem) {
    setBusy(true);
    try {
      await restoreBaechoo(it.table, it.id);
      await refresh(); // 메인 목록에 다시 나타나도록
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onPurge(it: TrashItem) {
    setBusy(true);
    try {
      await hardDeleteBaechoo(it.table, it.id);
      setConfirmId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="휴지통">
      <p className="mb-3 px-1 text-xs text-stone">
        삭제한 기록은 여기서 30일간 보관돼요. 복원하거나 완전히 지울 수 있어요.
      </p>

      {items === null ? (
        <div className="py-10 text-center text-sm text-stone">불러오는 중…</div>
      ) : items.length === 0 ? (
        <Empty>휴지통이 비어 있어요.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-line bg-cream p-3"
            >
              <p className="text-sm font-semibold text-ink">{it.label}</p>
              <p className="mt-0.5 text-[11px] text-stone">
                {it.deletedAt.slice(0, 10)} 삭제
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRestore(it)}
                  className="flex-1 rounded-lg bg-leaf py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  복원
                </button>
                {confirmId === it.id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPurge(it)}
                    className="flex-1 rounded-lg bg-coral py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    영구삭제 확정
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmId(it.id)}
                    className="flex-1 rounded-lg border border-line py-1.5 text-xs font-semibold text-coral disabled:opacity-50"
                  >
                    영구삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
