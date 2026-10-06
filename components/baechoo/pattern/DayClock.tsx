"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/format";
import { KIND_COLOR, dayHeader, daySummary, summaryLabel, type BaechooEvent } from "@/lib/baechooEvents";
import { arcPath, dayLayout, polarPoint, type TimedItem } from "@/lib/baechooPattern";
import Stepper from "./Stepper";

const SIZE = 320;
const C = SIZE / 2;
const R_OUT = 138;
const R_IN = 66;
const R_LABEL = 151;

export default function DayClock({
  items,
  events,
  today,
  nowMin,
}: {
  items: TimedItem[];
  events: BaechooEvent[];
  today: string;
  nowMin: number;
}) {
  const [date, setDate] = useState(today);
  const layout = useMemo(() => dayLayout(items, date), [items, date]);
  const summary = summaryLabel(daySummary(events, date));
  const [, m, d] = date.split("-").map(Number);
  const hand = polarPoint(C, C, R_OUT, nowMin);

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[340px]" role="img" aria-label={`${dayHeader(date)} 일과표`}>
        <circle cx={C} cy={C} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--color-fill)" strokeWidth={R_OUT - R_IN} />
        {layout.segments.map((s) => (
          <path key={s.key} d={arcPath(C, C, R_OUT, R_IN, s.startMin, s.endMin)} fill={KIND_COLOR[s.kind].face} />
        ))}
        {Array.from({ length: 12 }, (_, i) => i * 120).map((min) => {
          const p = polarPoint(C, C, R_LABEL, min);
          return (
            <text key={min} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={11} className="fill-stone">
              {min / 60}
            </text>
          );
        })}
        {layout.stools.map((s) => {
          const p = polarPoint(C, C, R_OUT - 9, s.min);
          return <circle key={s.key} cx={p.x} cy={p.y} r={5} fill={KIND_COLOR.stool.face} stroke="#fff" strokeWidth={1.5} />;
        })}
        {date === today && (
          <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="var(--color-ink)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
        )}
        <circle cx={C} cy={C} r={R_IN - 6} fill="var(--color-card)" />
        <text x={C} y={C - 8} textAnchor="middle" fontSize={13} className="fill-stone">
          {date === today ? "오늘" : "DAY"}
        </text>
        <text x={C} y={C + 14} textAnchor="middle" fontSize={22} fontWeight={700} className="fill-ink">
          {m}/{d}
        </text>
      </svg>
      <p className="mt-2 text-center text-[13px] text-stone">{summary || "기록 없음"}</p>
      <Stepper
        label={`${date.slice(0, 4)}년 ${dayHeader(date)}`}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        nextDisabled={date >= today}
      />
    </div>
  );
}
