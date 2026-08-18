"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO } from "@/lib/format";
import type { DailyTodo } from "@/lib/types";
import DateStrip from "./DateStrip";
import MissionCard from "./MissionCard";
import TodoSections from "./TodoSections";
import Heatmap from "./Heatmap";
import TodoForm from "./TodoForm";
import ManageSheet from "./ManageSheet";
import CategorySheet from "./CategorySheet";
import { PrimaryButton } from "@/components/budget/ui";

export default function DailyTodoApp() {
  const { dailyTodos, dailyTodoCategories, dailyTodoSettings } = useData();
  const [date, setDate] = useState(todayISO());
  const [form, setForm] = useState<{ editing: DailyTodo | null } | null>(null);
  const [manage, setManage] = useState(false);
  const [cats, setCats] = useState(false);
  const today = todayISO();

  return (
    <div className="space-y-3">
      <DateStrip date={date} today={today} onChange={setDate} />
      <MissionCard
        todos={dailyTodos}
        date={date}
        today={today}
        goalPct={dailyTodoSettings.goalPct}
      />
      <TodoSections
        todos={dailyTodos}
        cats={dailyTodoCategories}
        date={date}
        readonly={date > today}
        onEdit={(t) => setForm({ editing: t })}
      />

      <Heatmap
        todos={dailyTodos}
        date={date}
        today={today}
        goalPct={dailyTodoSettings.goalPct}
        onPick={setDate}
      />

      <div className="flex gap-2 pt-1">
        <PrimaryButton onClick={() => setForm({ editing: null })}>+ 항목 추가</PrimaryButton>
        <button
          type="button"
          onClick={() => setManage(true)}
          className="shrink-0 rounded-xl border border-line px-4 text-sm font-semibold text-stone"
        >
          관리
        </button>
      </div>

      {form && (
        <TodoForm
          key={form.editing?.id ?? "new"}
          open
          onClose={() => setForm(null)}
          editing={form.editing}
          cats={dailyTodoCategories}
          defaultDate={date}
        />
      )}
      <ManageSheet
        open={manage}
        onClose={() => setManage(false)}
        onEdit={(t) => {
          setManage(false);
          setForm({ editing: t });
        }}
        onOpenCategories={() => {
          setManage(false);
          setCats(true);
        }}
      />
      <CategorySheet open={cats} onClose={() => setCats(false)} />
    </div>
  );
}
