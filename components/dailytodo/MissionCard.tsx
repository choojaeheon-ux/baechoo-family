"use client";

import { useMemo } from "react";
import { achievedOn, progressOn, streak } from "@/lib/dailyTodo";
import type { DailyTodo } from "@/lib/types";
import { Card } from "@/components/budget/ui";

const R = 42;
const CIRC = 2 * Math.PI * R;

export default function MissionCard({
  todos,
  date,
  today,
  goalPct,
}: {
  todos: DailyTodo[];
  date: string;
  today: string;
  goalPct: number;
}) {
  const p = useMemo(() => progressOn(todos, date), [todos, date]);
  const days = useMemo(() => streak(todos, today, goalPct), [todos, today, goalPct]);
  const achieved = achievedOn(todos, date, goalPct);

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-line)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={achieved ? "var(--color-leaf)" : "var(--color-gold)"}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - p.pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {p.total === 0 ? (
              <span className="text-[11px] font-semibold text-stone">항목 없음</span>
            ) : (
              <>
                <span className="text-xl font-extrabold leading-none text-ink">{p.pct}%</span>
                <span className="mt-1 text-[11px] text-stone">
                  {p.done}/{p.total}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            {achieved ? `목표 ${goalPct}% 달성` : `목표 ${goalPct}%`}
          </p>
          <p className="mt-1.5 text-[13px] text-stone">연속 {days}일</p>
        </div>
      </div>
    </Card>
  );
}
