"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO } from "@/lib/format";
import DateStrip from "./DateStrip";
import MissionCard from "./MissionCard";
import TodoSections from "./TodoSections";

export default function DailyTodoApp() {
  const { dailyTodos, dailyTodoCategories, dailyTodoSettings } = useData();
  const [date, setDate] = useState(todayISO());
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
      />
    </div>
  );
}
