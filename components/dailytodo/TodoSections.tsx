"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { groupByCategory, isDoneOn, toggleDone } from "@/lib/dailyTodo";
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
  const { saveDailyTodo } = useData();
  const groups = useMemo(() => groupByCategory(todos, cats, date), [todos, cats, date]);

  if (groups.length === 0) return <Empty>이 날짜에 할 일이 없어요</Empty>;

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <Card key={g.cat.id}>
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: g.cat.color }}
            />
            <span className="text-sm font-bold text-ink">{g.cat.name}</span>
            <span className="ml-auto text-xs font-semibold text-stone">
              {g.done}/{g.total}
            </span>
          </div>
          <div>
            {g.items.map((t) => {
              const done = isDoneOn(t, date);
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={readonly}
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
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      className="shrink-0 px-1.5 py-2 text-xs text-stone"
                      aria-label={`${t.title} 편집`}
                    >
                      편집
                    </button>
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
