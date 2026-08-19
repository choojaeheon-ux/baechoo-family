"use client";

import { addDays, weekdayKo } from "@/lib/format";

function label(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}월 ${Number(d)}일 (${weekdayKo(iso)})`;
}

export default function DateStrip({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (iso: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-1 py-2">
      <button
        type="button"
        onClick={() => onChange(addDays(date, -1))}
        className="px-4 py-1 text-xl leading-none text-stone"
        aria-label="이전 날"
      >
        ‹
      </button>
      <div className="text-center">
        <p className="text-sm font-bold text-ink">{label(date)}</p>
        {date !== today && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="mt-0.5 text-[11px] font-semibold text-leaf"
          >
            오늘로
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        className="px-4 py-1 text-xl leading-none text-stone"
        aria-label="다음 날"
      >
        ›
      </button>
    </div>
  );
}
