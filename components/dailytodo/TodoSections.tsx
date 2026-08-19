"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { groupByCategory, isDoneOn, toggleDone } from "@/lib/dailyTodo";
import { moveCategory, moveTodo } from "@/lib/dailyTodoOrder";
import type { DailyTodo, DailyTodoCategory } from "@/lib/types";
import { Card, Empty } from "@/components/budget/ui";

export default function TodoSections({
  todos,
  cats,
  date,
  readonly,
  onEdit,
}: {
  todos: DailyTodo[];
  cats: DailyTodoCategory[];
  date: string;
  readonly: boolean;
  onEdit?: (t: DailyTodo) => void;
}) {
  const { saveDailyTodo, saveDailyTodoCategory } = useData();
  const [ordering, setOrdering] = useState(false);
  const [saving, setSaving] = useState(false);
  const groups = useMemo(() => groupByCategory(todos, cats, date), [todos, cats, date]);

  // 바뀐 행만 저장한다(예산 탭 applyOrder와 같은 방식).
  async function apply<T extends { id: string; sortOrder: number }>(
    current: T[],
    next: T[],
    save: (row: T) => Promise<void>
  ) {
    if (saving) return;
    const before = new Map(current.map((r) => [r.id, r.sortOrder]));
    const changed = next.filter((r) => before.get(r.id) !== r.sortOrder);
    if (changed.length === 0) return;
    setSaving(true);
    try {
      for (const r of changed) await save(r);
    } catch (e) {
      console.error("순서 저장 실패", e);
      window.alert("순서를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (groups.length === 0) return <Empty>이 날짜에 할 일이 없어요</Empty>;

  const visibleCatIds = groups.map((g) => g.cat.id);
  const visibleTodoIds = groups.flatMap((g) => g.items.map((t) => t.id));
  const arrowCls = "px-2 py-1 text-sm text-leaf disabled:text-stone/40";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOrdering((v) => !v)}
          className="text-xs font-semibold text-stone"
        >
          {ordering ? "편집 완료" : "순서 편집"}
        </button>
      </div>

      {groups.map((g, gi) => (
        <Card key={g.cat.id}>
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: g.cat.color }}
            />
            <span className="text-sm font-bold text-ink">{g.cat.name}</span>
            {ordering ? (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={gi === 0 || saving}
                  onClick={() =>
                    apply(cats, moveCategory(cats, visibleCatIds, g.cat.id, -1), saveDailyTodoCategory)
                  }
                  aria-label={`${g.cat.name} 위로`}
                  className={arrowCls}
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={gi === groups.length - 1 || saving}
                  onClick={() =>
                    apply(cats, moveCategory(cats, visibleCatIds, g.cat.id, 1), saveDailyTodoCategory)
                  }
                  aria-label={`${g.cat.name} 아래로`}
                  className={arrowCls}
                >
                  ▼
                </button>
              </div>
            ) : (
              <span className="ml-auto text-xs font-semibold text-stone">
                {g.done}/{g.total}
              </span>
            )}
          </div>
          <div>
            {g.items.map((t, ti) => {
              const done = isDoneOn(t, date);
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={readonly || ordering}
                    onClick={() => saveDailyTodo(toggleDone(t, date))}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left disabled:opacity-40"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        done ? "border-leaf bg-leaf text-white" : "border-line"
                      }`}
                    >
                      {done && <span className="text-[11px] leading-none">✓</span>}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-[15px] ${
                        done ? "text-stone line-through" : "text-ink"
                      }`}
                    >
                      {t.title}
                    </span>
                    {t.onceDate && (
                      <span className="shrink-0 rounded-md bg-cream px-1.5 py-0.5 text-[10px] font-semibold text-stone">
                        1회
                      </span>
                    )}
                  </button>
                  {ordering ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={ti === 0 || saving}
                        onClick={() =>
                          apply(todos, moveTodo(todos, visibleTodoIds, t.id, -1), saveDailyTodo)
                        }
                        aria-label={`${t.title} 위로`}
                        className={arrowCls}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={ti === g.items.length - 1 || saving}
                        onClick={() =>
                          apply(todos, moveTodo(todos, visibleTodoIds, t.id, 1), saveDailyTodo)
                        }
                        aria-label={`${t.title} 아래로`}
                        className={arrowCls}
                      >
                        ▼
                      </button>
                    </div>
                  ) : (
                    onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="shrink-0 px-1.5 py-2 text-xs text-stone"
                        aria-label={`${t.title} 편집`}
                      >
                        편집
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
