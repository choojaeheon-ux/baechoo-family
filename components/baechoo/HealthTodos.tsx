"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, ddayLabel, dday } from "@/lib/format";
import type { BaechooHealthTodo } from "@/lib/types";
import { Card, Pill, SectionTitle } from "@/components/budget/ui";
import { HealthTodoForm } from "./forms";

// 체크 동그라미
function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
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

export default function HealthTodos() {
  const { baechooHealthTodos, saveBaechooHealthTodo } = useData();
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooHealthTodo }>({
    open: false,
  });
  const today = todayISO();

  const daily = useMemo(
    () => baechooHealthTodos.filter((t) => t.kind === "daily"),
    [baechooHealthTodos]
  );
  // 예정(once) 중 미완료 — 가까운 순
  const upcoming = useMemo(
    () =>
      baechooHealthTodos
        .filter((t) => t.kind === "once" && !t.done)
        .sort((a, b) => (a.dueDate ?? "") < (b.dueDate ?? "") ? -1 : 1),
    [baechooHealthTodos]
  );
  // 완료(once) — 완료일 최신순
  const doneOnce = useMemo(
    () =>
      baechooHealthTodos
        .filter((t) => t.kind === "once" && t.done)
        .sort((a, b) => ((a.completedAt ?? "") > (b.completedAt ?? "") ? -1 : 1)),
    [baechooHealthTodos]
  );

  async function toggleDaily(t: BaechooHealthTodo) {
    const has = t.doneDates.includes(today);
    await saveBaechooHealthTodo({
      ...t,
      doneDates: has
        ? t.doneDates.filter((d) => d !== today)
        : [...t.doneDates, today],
    });
  }

  async function completeOnce(t: BaechooHealthTodo) {
    await saveBaechooHealthTodo({ ...t, done: true, completedAt: today });
  }

  async function uncheckOnce(t: BaechooHealthTodo) {
    await saveBaechooHealthTodo({ ...t, done: false, completedAt: null });
  }

  const hasAny = daily.length > 0 || upcoming.length > 0 || doneOnce.length > 0;

  return (
    <div>
      <SectionTitle
        right={
          <button
            onClick={() => setForm({ open: true })}
            className="text-xs font-bold text-leaf-dark"
          >
            + 할 일
          </button>
        }
      >
        할 일
      </SectionTitle>

      {!hasAny ? (
        <Card>
          <p className="py-2 text-center text-sm text-stone">
            약·예방접종 예정일이나 매일 양치 같은 할 일을 추가해 보세요.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* 오늘 할 일 (매일) */}
          {daily.length > 0 && (
            <Card>
              <p className="mb-2 text-xs font-bold text-stone">오늘 할 일</p>
              <div className="space-y-2">
                {daily.map((t) => {
                  const on = t.doneDates.includes(today);
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <Check on={on} onClick={() => toggleDaily(t)} />
                      <button
                        onClick={() => setForm({ open: true, initial: t })}
                        className={`flex-1 truncate text-left text-sm font-semibold ${
                          on ? "text-stone line-through" : "text-ink"
                        }`}
                      >
                        {t.title}
                      </button>
                      <Pill tone="leaf">매일</Pill>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 예정 (약·접종) */}
          {upcoming.length > 0 && (
            <Card>
              <p className="mb-2 text-xs font-bold text-stone">예정</p>
              <div className="space-y-2">
                {upcoming.map((t) => {
                  const left = t.dueDate ? dday(t.dueDate) : 0;
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <Check on={false} onClick={() => completeOnce(t)} />
                      <button
                        onClick={() => setForm({ open: true, initial: t })}
                        className="flex-1 truncate text-left text-sm font-semibold text-ink"
                      >
                        {t.title}
                      </button>
                      {t.dueDate && (
                        <Pill tone={left < 0 ? "coral" : left <= 3 ? "gold" : "stone"}>
                          {ddayLabel(t.dueDate)}
                        </Pill>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 완료 (약·접종) */}
          {doneOnce.length > 0 && (
            <Card>
              <p className="mb-2 text-xs font-bold text-stone">완료 {doneOnce.length}</p>
              <div className="space-y-2">
                {doneOnce.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <Check on={true} onClick={() => uncheckOnce(t)} />
                    <button
                      onClick={() => setForm({ open: true, initial: t })}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-stone line-through"
                    >
                      {t.title}
                    </button>
                    <Pill tone="leaf">완료</Pill>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {form.open && (
        <HealthTodoForm
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
