"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO } from "@/lib/format";
import type { DailyTodo } from "@/lib/types";
import { Sheet, Field, inputCls } from "@/components/budget/ui";

function Row({
  t,
  right,
  onEdit,
}: {
  t: DailyTodo;
  right: string;
  onEdit: (t: DailyTodo) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(t)}
      className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{t.title}</span>
      <span className="shrink-0 text-[11px] text-stone">{right}</span>
    </button>
  );
}

export default function ManageSheet({
  open,
  onClose,
  onEdit,
  onOpenCategories,
}: {
  open: boolean;
  onClose: () => void;
  onEdit: (t: DailyTodo) => void;
  onOpenCategories: () => void;
}) {
  const { dailyTodos, dailyTodoCategories, dailyTodoSettings, saveDailyTodoSettings } =
    useData();
  const [goal, setGoal] = useState(String(dailyTodoSettings.goalPct));
  const today = todayISO();

  const catName = useMemo(
    () => new Map(dailyTodoCategories.map((c) => [c.id, c.name])),
    [dailyTodoCategories]
  );

  // 매일 = 아직 그만두지 않은 반복 항목
  const daily = dailyTodos
    .filter((t) => t.onceDate === null && (t.endDate === null || t.endDate > today))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // 1회성 = 오늘 이후로 예정된 것만
  const upcoming = dailyTodos
    .filter((t) => t.onceDate !== null && t.onceDate >= today)
    .sort((a, b) => (a.onceDate ?? "").localeCompare(b.onceDate ?? ""));

  function commitGoal() {
    const n = Math.min(100, Math.max(0, Math.round(Number(goal) || 0)));
    setGoal(String(n));
    if (n !== dailyTodoSettings.goalPct) saveDailyTodoSettings({ goalPct: n });
  }

  return (
    <Sheet open={open} onClose={onClose} title="관리">
      <Field label="하루 목표 (%)">
        <input
          type="number"
          min={0}
          max={100}
          className={inputCls}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={commitGoal}
        />
      </Field>

      <button
        type="button"
        onClick={onOpenCategories}
        className="mb-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink"
      >
        카테고리 관리
      </button>

      <p className="mb-1.5 text-xs font-bold text-stone">매일 {daily.length}</p>
      <div className="space-y-1.5">
        {daily.map((t) => (
          <Row key={t.id} t={t} right={catName.get(t.categoryId) ?? "기타"} onEdit={onEdit} />
        ))}
        {daily.length === 0 && <p className="py-2 text-xs text-stone">아직 없어요</p>}
      </div>

      <p className="mb-1.5 mt-4 text-xs font-bold text-stone">예정 {upcoming.length}</p>
      <div className="space-y-1.5">
        {upcoming.map((t) => (
          <Row key={t.id} t={t} right={t.onceDate ?? ""} onEdit={onEdit} />
        ))}
        {upcoming.length === 0 && <p className="py-2 text-xs text-stone">아직 없어요</p>}
      </div>
    </Sheet>
  );
}
