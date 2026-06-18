"use client";

import { useEffect, useState } from "react";
import { daysInMonth, todayISO } from "@/lib/format";
import { Card } from "@/components/budget/ui";
import { MonthSwitcher } from "@/components/budget/ui";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 배추 기록용 월간 캘린더. 마커 찍힌 날 클릭 시 하단에 renderDay() 패널.
export default function BaechooCalendar({
  ym,
  onYmChange,
  markedDates,
  renderDay,
}: {
  ym: string;
  onYmChange: (ym: string) => void;
  markedDates: Set<string>; // YYYY-MM-DD
  renderDay: (iso: string) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayISO();

  useEffect(() => {
    setSelected(null);
  }, [ym]);

  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const dim = daysInMonth(ym);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-2">
      <Card>
        <div className="mb-3">
          <MonthSwitcher ym={ym} onChange={onYmChange} />
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-stone">
          {WEEK.map((w, i) => (
            <span key={w} className={i === 0 ? "text-coral" : i === 6 ? "text-sky" : ""}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (day === null) return <span key={`e${idx}`} />;
            const iso = `${ym}-${String(day).padStart(2, "0")}`;
            const isToday = iso === today;
            const isSelected = selected === iso;
            const marked = markedDates.has(iso);
            return (
              <button
                key={day}
                onClick={() => setSelected((p) => (p === iso ? null : iso))}
                className="flex flex-col items-center"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isToday ? "bg-leaf font-bold text-white" : "text-ink"
                  } ${isSelected ? "ring-2 ring-leaf ring-offset-1" : ""}`}
                >
                  {day}
                </span>
                <span className="mt-0.5 flex h-1.5">
                  {marked && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-leaf)]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card>
          <p className="mb-2 text-sm font-bold text-ink">
            {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일
          </p>
          {renderDay(selected)}
        </Card>
      )}
    </div>
  );
}
