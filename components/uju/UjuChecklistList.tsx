"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, ddayLabel, dday } from "@/lib/format";
import type { UjuChecklist } from "@/lib/types";
import { Card, Pill } from "@/components/budget/ui";

// 체크 동그라미 (배추 할 일과 동일)
export function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
        on ? "border-leaf bg-leaf text-white" : "border-line text-transparent"
      }`}
    >
      ✓
    </button>
  );
}

// 체크리스트 전체 D-day 리스트 — 미완료(가까운 순) → 완료(아래 묶음)
export default function UjuChecklistList({
  onEdit,
}: {
  onEdit: (item: UjuChecklist) => void;
}) {
  const { ujuChecklists, saveUjuChecklist } = useData();
  const today = todayISO();

  const pending = useMemo(
    () =>
      ujuChecklists
        .filter((c) => !c.done)
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
    [ujuChecklists]
  );
  const done = useMemo(
    () =>
      ujuChecklists
        .filter((c) => c.done)
        .sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1)),
    [ujuChecklists]
  );

  async function toggle(c: UjuChecklist) {
    await saveUjuChecklist({
      ...c,
      done: !c.done,
      completedAt: c.done ? null : today,
    });
  }

  if (ujuChecklists.length === 0) {
    return (
      <Card>
        <p className="py-2 text-center text-sm text-stone">
          기한이 있는 준비 항목을 추가해 보세요. (예: 예방접종, 출산 준비물)
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {pending.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-bold text-stone">예정 · 진행</p>
          <div className="space-y-2">
            {pending.map((c) => {
              const left = dday(c.dueDate);
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <Check on={false} onClick={() => toggle(c)} />
                  <button
                    onClick={() => onEdit(c)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-ink">
                      {c.title}
                    </span>
                    <span className="block text-[11px] text-stone">
                      {Number(c.dueDate.slice(5, 7))}/{Number(c.dueDate.slice(8, 10))}
                      {c.memo ? ` · ${c.memo}` : ""}
                    </span>
                  </button>
                  <Pill tone={left < 0 ? "coral" : left <= 3 ? "gold" : "stone"}>
                    {ddayLabel(c.dueDate)}
                  </Pill>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-bold text-stone">완료 {done.length}</p>
          <div className="space-y-2">
            {done.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Check on={true} onClick={() => toggle(c)} />
                <button
                  onClick={() => onEdit(c)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-stone line-through"
                >
                  {c.title}
                </button>
                <Pill tone="leaf">완료</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
