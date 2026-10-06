"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/format";
import { KIND_COLOR } from "@/lib/baechooEvents";
import { dayLayout, weekDates, type TimedItem } from "@/lib/baechooPattern";
import Stepper from "./Stepper";

const W = 340;
const AXIS = 24;
const GAP = 4;
const TOP = 8;
const H = 440;
const COL_W = (W - AXIS * 2 - GAP * 6) / 7;
const y = (min: number) => TOP + (min / 1440) * H;
const pad = (n: number) => String(n).padStart(2, "0");

function md(iso: string): [number, number, number] {
  const [yy, mm, dd] = iso.split("-").map(Number);
  return [yy, mm, dd];
}

export default function WeekColumns({ items, today, nowMin }: { items: TimedItem[]; today: string; nowMin: number }) {
  const [end, setEnd] = useState(today);
  const cols = useMemo(() => weekDates(end).map((date) => ({ date, layout: dayLayout(items, date) })), [items, end]);
  const [, m0, d0] = md(cols[0].date);
  const [, m6, d6] = md(cols[6].date);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${TOP + H + 28}`} className="block w-full" role="img" aria-label="주간 패턴">
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <g key={h}>
            <line x1={AXIS} x2={W - AXIS} y1={y(h * 60)} y2={y(h * 60)} stroke="var(--color-separator)" />
            <text x={AXIS - 4} y={y(h * 60)} textAnchor="end" dominantBaseline="central" fontSize={10} className="fill-stone">
              {pad(h)}
            </text>
            <text x={W - AXIS + 4} y={y(h * 60)} textAnchor="start" dominantBaseline="central" fontSize={10} className="fill-stone">
              {pad(h)}
            </text>
          </g>
        ))}
        {cols.map(({ date, layout }, i) => {
          const x = AXIS + i * (COL_W + GAP);
          const [yy, mm, dd] = md(date);
          const sunday = new Date(yy, mm - 1, dd).getDay() === 0;
          return (
            <g key={date}>
              <rect x={x} y={TOP} width={COL_W} height={H} rx={3} fill="var(--color-fill)" />
              {layout.segments.map((s) => (
                <rect
                  key={s.key}
                  x={x}
                  y={y(s.startMin)}
                  width={COL_W}
                  height={Math.max(3, y(s.endMin) - y(s.startMin))}
                  fill={KIND_COLOR[s.kind].face}
                />
              ))}
              {layout.stools.map((s) => (
                <circle key={s.key} cx={x + COL_W / 2} cy={y(s.min)} r={4.5} fill={KIND_COLOR.stool.face} stroke="#fff" strokeWidth={1.5} />
              ))}
              <text
                x={x + COL_W / 2}
                y={TOP + H + 18}
                textAnchor="middle"
                fontSize={11}
                fontWeight={date === today ? 700 : 400}
                className={sunday ? "fill-coral" : "fill-stone"}
              >
                {i === 0 || dd === 1 ? `${mm}/${dd}` : `${dd}일`}
              </text>
            </g>
          );
        })}
        {cols.some((c) => c.date === today) && (
          <g>
            <line x1={AXIS} x2={W - AXIS} y1={y(nowMin)} y2={y(nowMin)} stroke="var(--color-sky)" strokeWidth={1.2} />
            <text x={W - AXIS} y={y(nowMin) - 4} textAnchor="end" fontSize={10} className="fill-sky">
              {pad(Math.floor(nowMin / 60))}:{pad(nowMin % 60)}
            </text>
          </g>
        )}
      </svg>
      <Stepper
        label={`${m0}월 ${d0}일 – ${m6}월 ${d6}일`}
        onPrev={() => setEnd(addDays(end, -7))}
        onNext={() => setEnd(addDays(end, 7))}
        nextDisabled={end >= today}
      />
    </div>
  );
}
