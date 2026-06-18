"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { ddayLabel, dday } from "@/lib/format";
import { todoAssigneeName, type WeekTodo } from "@/lib/types";
import { Card, Pill } from "@/components/budget/ui";

function TodoRow({
  todo,
  onCheck,
  onEdit,
  onRevert,
}: {
  todo: WeekTodo;
  onCheck: (t: WeekTodo) => void;
  onEdit: (t: WeekTodo) => void;
  onRevert: (t: WeekTodo) => void;
}) {
  const done = todo.status === "done";
  const cancelled = todo.status === "cancelled";
  const closed = done || cancelled;
  const left = todo.dueDate ? dday(todo.dueDate) : null;

  return (
    <div className="flex items-start gap-3 rounded-xl px-1 py-2">
      {/* 체크박스: 진행중→액션시트 / 완료·취소→되돌리기 */}
      <button
        onClick={() => (closed ? onRevert(todo) : onCheck(todo))}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
          done
            ? "border-leaf bg-leaf text-white"
            : cancelled
              ? "border-line bg-line text-stone"
              : "border-line text-transparent"
        }`}
        aria-label={closed ? "되돌리기" : "완료/미룸/취소"}
      >
        {done ? "✓" : cancelled ? "✕" : ""}
      </button>

      <button onClick={() => onEdit(todo)} className="flex-1 text-left">
        <p
          className={`text-sm font-semibold ${
            closed ? "text-stone line-through" : "text-ink"
          }`}
        >
          {todo.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Pill tone={todo.assignee === "together" ? "leaf" : "sky"}>
            {todoAssigneeName(todo.assignee)}
          </Pill>
          {todo.dueDate && !closed && (
            <Pill tone={left! < 0 ? "coral" : left! <= 3 ? "gold" : "stone"}>
              {ddayLabel(todo.dueDate)}
            </Pill>
          )}
          {todo.deferCount > 0 && <Pill tone="gold">미룸{todo.deferCount}</Pill>}
          {cancelled && <Pill tone="coral">취소</Pill>}
        </div>
        {todo.memo && (
          <p className="mt-1 text-xs leading-relaxed text-stone">{todo.memo}</p>
        )}
      </button>
    </div>
  );
}

// 주차/날짜미정 공용 그룹 카드
export default function TodoGroup({
  title,
  muted = false,
  todos,
  onAdd,
  onCheck,
  onEdit,
  emptyText = "할 일이 없어요.",
}: {
  title: string;
  muted?: boolean;
  todos: WeekTodo[];
  onAdd: () => void;
  onCheck: (t: WeekTodo) => void;
  onEdit: (t: WeekTodo) => void;
  emptyText?: string;
}) {
  const { saveWeekTodo } = useData();
  const [showClosed, setShowClosed] = useState(false);

  const pending = todos.filter((t) => t.status === "pending");
  const closed = todos.filter((t) => t.status !== "pending");

  const revert = (t: WeekTodo) =>
    saveWeekTodo({ ...t, status: "pending", completedAt: null });

  return (
    <Card className="space-y-1">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className={`text-sm font-bold ${muted ? "text-stone" : "text-ink"}`}>
          {title}
        </p>
        <button onClick={onAdd} className="text-xs font-semibold text-leaf">
          + 추가
        </button>
      </div>

      {pending.length === 0 && closed.length === 0 ? (
        <p className="px-1 py-2 text-xs text-stone">{emptyText}</p>
      ) : (
        pending.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            onCheck={onCheck}
            onEdit={onEdit}
            onRevert={revert}
          />
        ))
      )}

      {closed.length > 0 && (
        <div className="mt-1 border-t border-line pt-1">
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="flex w-full items-center justify-between px-1 py-1.5 text-xs font-semibold text-stone"
          >
            <span>완료·취소 {closed.length}개</span>
            <span>{showClosed ? "▲" : "▼"}</span>
          </button>
          {showClosed &&
            closed.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                onCheck={onCheck}
                onEdit={onEdit}
                onRevert={revert}
              />
            ))}
        </div>
      )}
    </Card>
  );
}
