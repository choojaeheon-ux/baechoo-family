"use client";

import { addDays, weekdayKo } from "@/lib/format";
import { IconChevron } from "@/components/ios";

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
    <div className="flex items-center justify-between py-1">
      <button
        type="button"
        onClick={() => onChange(addDays(date, -1))}
        className="glass press flex h-10 w-10 items-center justify-center rounded-full text-leaf"
        aria-label="이전 날"
      >
        <IconChevron dir="left" />
      </button>
      <div className="text-center">
        <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{label(date)}</p>
        {date !== today && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="press mt-1 rounded-full bg-leaf-light px-2.5 py-0.5 text-[12px] font-semibold text-leaf-dark"
          >
            오늘로
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        className="glass press flex h-10 w-10 items-center justify-center rounded-full text-leaf"
        aria-label="다음 날"
      >
        <IconChevron dir="right" />
      </button>
    </div>
  );
}
