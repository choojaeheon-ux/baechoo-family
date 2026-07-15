"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import {
  currentWeekNum,
  blockOfWeek,
  weeksInBlock,
  weekLabel,
  weekRange,
  dday,
  TOTAL_BLOCKS,
} from "@/lib/format";
import type { WeekTodo } from "@/lib/types";
import { ProgressBar } from "@/components/budget/ui";
import TodoGroup from "./TodoGroup";
import { WeekTodoForm, TodoActionSheet } from "./forms";

type View = "weeks" | "unscheduled";

// embedded: 캘린더 탭 서브탭으로 렌더될 때 — 타이틀 행 숨김·sticky 해제(부모 헤더와 충돌 방지)
export default function Todo52App({ embedded = false }: { embedded?: boolean }) {
  const { loading, mode, weekTodos } = useData();
  const thisYear = new Date().getFullYear();
  // 선택 가능한 연도: 작년 ~ 내후년 (회고 1년 + 계획 2년)
  const yearOptions = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState<View>("weeks");
  const [block, setBlock] = useState(blockOfWeek(currentWeekNum()));
  const [form, setForm] = useState<{
    open: boolean;
    initial?: WeekTodo;
    week: number | null;
  }>({ open: false, week: currentWeekNum() });
  const [actionTodo, setActionTodo] = useState<WeekTodo | null>(null);

  const weeks = weeksInBlock(block);

  // 이 연도 할 일만, 주차별로 그룹 (null = 날짜 미정)
  const { byWeek, unscheduled } = useMemo(() => {
    const m = new Map<number, WeekTodo[]>();
    const none: WeekTodo[] = [];
    for (const t of weekTodos) {
      if (t.year !== year) continue;
      if (t.weekNum === null) none.push(t);
      else m.set(t.weekNum, [...(m.get(t.weekNum) ?? []), t]);
    }
    return { byWeek: m, unscheduled: none };
  }, [weekTodos, year]);

  const unschedulePending = unscheduled.filter((t) => t.status === "pending").length;

  // 블록 진행률 (취소 제외, 완료/전체)
  const blockTodos = weeks.flatMap((w) => byWeek.get(w) ?? []);
  const active = blockTodos.filter((t) => t.status !== "cancelled");
  const done = active.filter((t) => t.status === "done").length;

  const first = weeks[0];
  const last = weeks[weeks.length - 1];

  return (
    <div>
      {/* 헤더 */}
      <header
        className={
          embedded
            ? "px-4 pt-3 pb-3"
            : "sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-3 backdrop-blur"
        }
      >
        <div className="mb-3 flex items-center gap-2">
          {!embedded && (
            <>
              <span className="text-2xl">🗓️</span>
              <div>
                <h1 className="text-lg font-extrabold leading-none text-ink">
                  52주 투두
                </h1>
                <p className="mt-0.5 text-[11px] text-stone">
                  {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
                </p>
              </div>
            </>
          )}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ml-auto rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold text-ink"
            aria-label="연도 선택"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>

        {/* 보기 토글 */}
        <div className="mb-3 flex gap-1">
          <button
            onClick={() => setView("weeks")}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              view === "weeks"
                ? "bg-leaf text-white"
                : "bg-card text-stone border border-line"
            }`}
          >
            주차별
          </button>
          <button
            onClick={() => setView("unscheduled")}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              view === "unscheduled"
                ? "bg-leaf text-white"
                : "bg-card text-stone border border-line"
            }`}
          >
            날짜 미정{unschedulePending > 0 ? ` ${unschedulePending}` : ""}
          </button>
        </div>

        {/* 4주 블록 스위처 (주차별 보기에서만) */}
        {view === "weeks" && (
          <>
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
          </>
        )}
      </header>

      <div className="space-y-2 px-4 pt-2 pb-4">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : view === "weeks" ? (
          weeks.map((w) => (
            <TodoGroup
              key={w}
              title={weekLabel(year, w)}
              muted={dday(weekRange(year, w)[1]) < 0}
              todos={byWeek.get(w) ?? []}
              onAdd={() => setForm({ open: true, week: w })}
              onCheck={(t) => setActionTodo(t)}
              onEdit={(t) => setForm({ open: true, initial: t, week: t.weekNum })}
            />
          ))
        ) : (
          <TodoGroup
            title="날짜 미정"
            todos={unscheduled}
            onAdd={() => setForm({ open: true, week: null })}
            onCheck={(t) => setActionTodo(t)}
            onEdit={(t) => setForm({ open: true, initial: t, week: t.weekNum })}
            emptyText="날짜 미정 할 일이 없어요. 추가하면 여기 모이고, 클릭해서 주차를 지정할 수 있어요."
          />
        )}
      </div>

      {form.open && (
        <WeekTodoForm
          key={form.initial?.id ?? `new-${form.week ?? "none"}`}
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
