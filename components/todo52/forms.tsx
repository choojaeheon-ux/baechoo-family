"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, weekLabel, currentWeekNum } from "@/lib/format";
import {
  TODO_ASSIGNEES,
  type TodoAssignee,
  type WeekTodo,
} from "@/lib/types";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";

const WEEK_OPTIONS = Array.from({ length: 52 }, (_, i) => i + 1);

// 할 일 추가/수정 폼
export function WeekTodoForm({
  open,
  onClose,
  year,
  defaultWeek,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  defaultWeek: number | null;
  initial?: WeekTodo;
}) {
  const { saveWeekTodo, removeWeekTodo } = useData();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [assignee, setAssignee] = useState<TodoAssignee>(
    initial?.assignee ?? "together"
  );
  const [weekNum, setWeekNum] = useState<number | null>(
    initial?.weekNum ?? defaultWeek
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const valid = title.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await saveWeekTodo({
      id: initial?.id ?? "",
      year,
      weekNum,
      title: title.trim(),
      assignee,
      dueDate: dueDate || null,
      memo: memo.trim() || null,
      status: initial?.status ?? "pending",
      deferCount: initial?.deferCount ?? 0,
      createdAt: initial?.createdAt || todayISO(),
      completedAt: initial?.completedAt ?? null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "할 일 수정" : "할 일 추가"}>
      <Field label="할 일">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 우주방 정리, 보험 서류 제출"
        />
      </Field>

      <Field label="담당자">
        <div className="flex gap-1">
          {TODO_ASSIGNEES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAssignee(a.id)}
              className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                assignee === a.id
                  ? "border-leaf bg-leaf text-white"
                  : "border-line bg-cream text-stone"
              }`}
            >
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="주차">
        <select
          className={inputCls}
          value={weekNum ?? "none"}
          onChange={(e) =>
            setWeekNum(e.target.value === "none" ? null : Number(e.target.value))
          }
        >
          <option value="none">날짜 미정</option>
          {WEEK_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {weekLabel(year, w)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="기한 (선택)">
        <input
          type="date"
          className={inputCls}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </Field>

      <Field label="요청사항 메모 (선택)">
        <textarea
          className={inputCls + " min-h-20 resize-none"}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="요청사항·참고할 점을 적어두세요"
        />
      </Field>

      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial && (
        <button
          onClick={async () => {
            await removeWeekTodo(initial.id);
            onClose();
          }}
          className="mt-3 w-full py-2 text-sm text-coral"
        >
          삭제
        </button>
      )}
    </Sheet>
  );
}

// 체크 시 액션: 완료 / 미룸(주 재지정) / 취소
export function TodoActionSheet({
  open,
  onClose,
  todo,
  year,
}: {
  open: boolean;
  onClose: () => void;
  todo: WeekTodo | null;
  year: number;
}) {
  const { saveWeekTodo } = useData();
  const [mode, setMode] = useState<"menu" | "defer">("menu");
  const [newWeek, setNewWeek] = useState(todo?.weekNum ?? currentWeekNum());
  const [newDue, setNewDue] = useState(todo?.dueDate ?? "");

  // todo가 바뀌면(시트 재오픈) 초기화 — key로 강제 리마운트(부모에서 처리)
  if (!todo) return null;

  // 날짜 미정 항목이면 "미룸" 대신 "주차 지정"
  const unscheduled = todo.weekNum === null;

  async function complete() {
    await saveWeekTodo({ ...todo!, status: "done", completedAt: todayISO() });
    onClose();
  }
  async function cancel() {
    await saveWeekTodo({ ...todo!, status: "cancelled" });
    onClose();
  }
  async function applyDefer() {
    await saveWeekTodo({
      ...todo!,
      weekNum: newWeek,
      dueDate: newDue || todo!.dueDate,
      // 미정→주차 지정은 미룸 아님(횟수 유지), 기존 주차 변경은 미룸(횟수+1)
      deferCount: todo!.weekNum === null ? todo!.deferCount : todo!.deferCount + 1,
      status: "pending",
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={todo.title}>
      {mode === "menu" ? (
        <div className="space-y-2">
          <button
            onClick={complete}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 text-left active:scale-[0.99]"
          >
            <span className="text-xl">✅</span>
            <span className="text-sm font-bold text-ink">완료</span>
          </button>
          <button
            onClick={() => setMode("defer")}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 text-left active:scale-[0.99]"
          >
            <span className="text-xl">{unscheduled ? "📅" : "⏳"}</span>
            <div>
              <p className="text-sm font-bold text-ink">
                {unscheduled ? "주차 지정" : "미룸 (날짜 재지정)"}
              </p>
              <p className="text-[11px] text-stone">
                {unscheduled ? "할 일을 주차에 배치해요" : "다른 주차로 옮겨요"}
              </p>
            </div>
          </button>
          <button
            onClick={cancel}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 text-left active:scale-[0.99]"
          >
            <span className="text-xl">🚫</span>
            <span className="text-sm font-bold text-coral">취소</span>
          </button>
        </div>
      ) : (
        <div>
          <Field label={unscheduled ? "지정할 주차" : "옮길 주차"}>
            <select
              className={inputCls}
              value={newWeek}
              onChange={(e) => setNewWeek(Number(e.target.value))}
            >
              {WEEK_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {weekLabel(year, w)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="기한 (선택)">
            <input
              type="date"
              className={inputCls}
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
            />
          </Field>
          <div className="mt-2">
            <PrimaryButton onClick={applyDefer}>
              {unscheduled ? "이 주차로 지정" : "이 주차로 미루기"}
            </PrimaryButton>
          </div>
          <button
            onClick={() => setMode("menu")}
            className="mt-3 w-full py-2 text-sm text-stone"
          >
            ← 뒤로
          </button>
        </div>
      )}
    </Sheet>
  );
}
