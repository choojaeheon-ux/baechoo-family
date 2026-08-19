"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { newId } from "@/lib/repo";
import { todayISO } from "@/lib/format";
import { applyEdit } from "@/lib/dailyTodo";
import type { DailyTodo, DailyTodoCategory } from "@/lib/types";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";

export default function TodoForm({
  open,
  onClose,
  editing,
  cats,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  editing: DailyTodo | null; // null = 신규
  cats: DailyTodoCategory[];
  defaultDate: string; // 특정일 기본값 = 지금 보고 있는 날짜
}) {
  const { saveDailyTodo, removeDailyTodo, dailyTodos } = useData();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? cats[0]?.id ?? "");
  const [once, setOnce] = useState(false); // 신규 생성 전용 — 편집은 성격을 바꾸지 않는다
  const [onceDate, setOnceDate] = useState(editing?.onceDate ?? defaultDate);
  const [confirming, setConfirming] = useState(false);

  const today = todayISO();
  // 편집에서는 항목의 성격(매일/1회성)이 생성 시점에 고정된다 — 토글을 두지 않는다.
  const isOnce = editing ? editing.onceDate !== null : once;
  // 특정일인데 날짜를 비우면 저장을 막는다 — 빈 날짜는 전 날짜 활성으로 번진다.
  const noDate = isOnce && !onceDate.trim();

  async function submit() {
    const t = title.trim();
    if (!t || !categoryId || noDate) return;

    if (editing) {
      // 편집은 제목·카테고리·(1회성이면) 지정일만 바꾼다. 성격과 활성 구간은 기록이라 건드리지 않는다.
      await saveDailyTodo(
        applyEdit(editing, {
          title: t,
          categoryId,
          ...(editing.onceDate !== null ? { onceDate } : {}),
        })
      );
    } else {
      const maxSort = dailyTodos.reduce((m, x) => Math.max(m, x.sortOrder), 0);
      await saveDailyTodo({
        id: newId(),
        title: t,
        categoryId,
        startDate: once ? onceDate : today,
        endDate: null,
        onceDate: once ? onceDate : null,
        doneDates: [],
        sortOrder: maxSort + 10,
        createdAt: today,
      });
    }
    onClose();
  }

  // 매일 항목은 '그만하기'(endDate=오늘) — 과거 기록을 남긴다.
  // 1회성은 과거 기록이 곧 항목 자체라 레코드를 지운다.
  async function del() {
    if (!editing) return;
    if (editing.onceDate) await removeDailyTodo(editing.id);
    else await saveDailyTodo({ ...editing, endDate: today });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "항목 편집" : "항목 추가"}>
      <Field label="할 일">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 양치"
        />
      </Field>

      <Field label="카테고리">
        <select
          className={inputCls}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {[...cats]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </Field>

      {!editing && (
        <Field label="언제">
          <div className="flex gap-1 rounded-xl bg-cream p-1">
            <button
              type="button"
              onClick={() => setOnce(false)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                !once ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              매일
            </button>
            <button
              type="button"
              onClick={() => setOnce(true)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                once ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              특정일
            </button>
          </div>
        </Field>
      )}

      {isOnce && (
        <Field label="날짜">
          <input
            type="date"
            className={inputCls}
            value={onceDate}
            onChange={(e) => setOnceDate(e.target.value)}
          />
        </Field>
      )}

      <PrimaryButton onClick={submit} disabled={!title.trim() || !categoryId || noDate}>
        저장
      </PrimaryButton>

      {editing && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 w-full py-2 text-sm text-coral"
        >
          {editing.onceDate ? "삭제" : "그만하기"}
        </button>
      )}
      {editing && confirming && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-stone">
            {editing.onceDate
              ? "이 항목을 지울까요?"
              : "오늘부터 목록에서 빠져요. 지난 기록은 그대로 남아요"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold text-stone"
            >
              취소
            </button>
            <button
              type="button"
              onClick={del}
              className="flex-1 rounded-xl bg-coral py-2 text-sm font-bold text-white"
            >
              {editing.onceDate ? "삭제 확정" : "그만하기 확정"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
