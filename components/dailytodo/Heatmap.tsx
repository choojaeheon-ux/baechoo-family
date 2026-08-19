"use client";

import { useMemo } from "react";
import { monthProgress } from "@/lib/dailyTodo";
import { yearMonthOf, ymLabel } from "@/lib/format";
import type { DailyTodo } from "@/lib/types";
import { Card } from "@/components/budget/ui";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// leaf(#5b8c3e)를 달성률만큼 진하게. 항목이 아예 없던 날은 칠하지 않는다.
function cellBg(pct: number, total: number): string {
  if (total === 0) return "transparent";
  return `rgba(91, 140, 62, ${(0.1 + 0.75 * (pct / 100)).toFixed(3)})`;
}

export default function Heatmap({
  todos,
  date,
  today,
  goalPct,
  onPick,
}: {
  todos: DailyTodo[];
  date: string;
  today: string;
  goalPct: number;
  onPick: (iso: string) => void;
}) {
  const ym = yearMonthOf(date);
  const cells = useMemo(() => monthProgress(todos, ym, goalPct), [todos, ym, goalPct]);
  // 1일이 무슨 요일인지 — 앞을 빈 칸으로 채운다.
  // 날짜만 있는 ISO 문자열은 UTC로 파싱되므로 다른 달력들과 같은 로컬시각 생성자를 쓴다.
  const [y, m] = ym.split("-").map(Number);
  const lead = new Date(y, m - 1, 1).getDay();

  return (
    <Card>
      <p className="mb-2 text-sm font-bold text-ink">{ymLabel(ym)}</p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[10px] font-semibold text-stone">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {cells.map((c) => {
          const day = Number(c.iso.slice(8));
          const selected = c.iso === date;
          const isToday = c.iso === today;
          // 세 신호(달성·오늘·선택)는 각각 다른 채널에 둔다 — 링 한 자리를 두고 다투면
          // "오늘 목표를 달성했다"처럼 가장 흔한 상태에서 도장이 가려진다.
          const ring = c.achieved ? "ring-2 ring-leaf" : isToday ? "ring-2 ring-gold" : "";
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onPick(c.iso)}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold ${ring}`}
              style={{
                backgroundColor: cellBg(c.pct, c.total),
                color: "var(--color-ink)",
                outline: selected ? "2px solid var(--color-ink)" : undefined,
                outlineOffset: selected ? "1px" : undefined,
              }}
              aria-label={`${day}일 ${c.total > 0 ? `${c.pct}%` : "기록 없음"}`}
            >
              {isToday ? <span className="font-extrabold">{day}</span> : day}
              {c.hasOnce && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: "var(--color-coral)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
