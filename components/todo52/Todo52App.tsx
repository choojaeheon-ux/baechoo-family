"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import {
  currentWeekNum,
  blockOfWeek,
  weeksInBlock,
  TOTAL_BLOCKS,
} from "@/lib/format";
import type { WeekTodo } from "@/lib/types";
import { ProgressBar } from "@/components/budget/ui";
import WeekSection from "./WeekSection";
import { WeekTodoForm, TodoActionSheet } from "./forms";

export default function Todo52App() {
  const { loading, mode, weekTodos } = useData();
  const year = new Date().getFullYear();
  const [block, setBlock] = useState(blockOfWeek(currentWeekNum()));
  const [form, setForm] = useState<{ open: boolean; initial?: WeekTodo; week: number }>(
    { open: false, week: currentWeekNum() }
  );
  const [actionTodo, setActionTodo] = useState<WeekTodo | null>(null);

  const weeks = weeksInBlock(block);

  // 이 연도 할 일만, 주차별로 그룹
  const byWeek = useMemo(() => {
    const m = new Map<number, WeekTodo[]>();
    for (const t of weekTodos) {
      if (t.year !== year) continue;
      m.set(t.weekNum, [...(m.get(t.weekNum) ?? []), t]);
    }
    return m;
  }, [weekTodos, year]);

  // 블록 진행률 (취소 제외, 완료/전체)
  const blockTodos = weeks.flatMap((w) => byWeek.get(w) ?? []);
  const active = blockTodos.filter((t) => t.status !== "cancelled");
  const done = active.filter((t) => t.status === "done").length;

  const first = weeks[0];
  const last = weeks[weeks.length - 1];

  return (
    <div>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">🗓️</span>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-ink">
              52주 투두
            </h1>
            <p className="mt-0.5 text-[11px] text-stone">
              {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
            </p>
          </div>
        </div>

        {/* 4주 블록 스위처 */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBlock((b) => Math.max(b - 1, 1))}
            disabled={block <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone hover:bg-leaf-light disabled:opacity-30"
          >
            ‹
          </button>
          <span className="min-w-40 text-center text-base font-bold text-ink">
            {year} · {first}~{last}주
          </span>
          <button
            onClick={() => setBlock((b) => Math.min(b + 1, TOTAL_BLOCKS))}
            disabled={block >= TOTAL_BLOCKS}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone hover:bg-leaf-light disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-semibold text-stone">
            블록 {block}/{TOTAL_BLOCKS}
          </span>
          <div className="flex-1">
            <ProgressBar value={done} max={active.length} />
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-leaf-dark tabular">
            {done}/{active.length}
          </span>
        </div>
      </header>

      <div className="space-y-2 px-4 pt-2 pb-4">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : (
          weeks.map((w) => (
            <WeekSection
              key={w}
              year={year}
              weekNum={w}
              todos={byWeek.get(w) ?? []}
              onAdd={(week) => setForm({ open: true, week })}
              onEdit={(t) => setForm({ open: true, initial: t, week: t.weekNum })}
              onCheck={(t) => setActionTodo(t)}
            />
          ))
        )}
      </div>

      {form.open && (
        <WeekTodoForm
          key={form.initial?.id ?? `new-${form.week}`}
          open={form.open}
          onClose={() => setForm((f) => ({ ...f, open: false }))}
          year={year}
          defaultWeek={form.week}
          initial={form.initial}
        />
      )}

      {actionTodo && (
        <TodoActionSheet
          key={actionTodo.id}
          open={!!actionTodo}
          onClose={() => setActionTodo(null)}
          todo={actionTodo}
          year={year}
        />
      )}
    </div>
  );
}
