"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/format";
import { KIND_COLOR, dateOf, dayHeader, durationLabel, hhmmOf, localMs, type EventSource } from "@/lib/baechooEvents";
import { withIntervals, type TimedItem } from "@/lib/baechooPattern";
import { Empty } from "@/components/budget/ui";

export default function IntervalList({
  items,
  today,
  onOpen,
}: {
  items: TimedItem[];
  today: string;
  onOpen: (s: EventSource) => void;
}) {
  const [days, setDays] = useState(7);
  const rows = useMemo(() => withIntervals(items), [items]);
  const cutoff = localMs(addDays(today, -(days - 1)), "00:00");
  const shown = rows.filter((r) => r.item.at >= cutoff);
  const hasMore = shown.length < rows.length;

  if (rows.length === 0) return <Empty>선택한 종류의 기록이 없어요.</Empty>;
  return (
    <div>
      <div className="relative">
        <div aria-hidden className="absolute bottom-0 top-0 w-px bg-line" style={{ left: 94 }} />
        {shown.map((r, i) => {
          const d = dateOf(r.item.at);
          const newDay = i === 0 || dateOf(shown[i - 1].item.at) !== d;
          const c = KIND_COLOR[r.item.kind];
          return (
            <div key={r.item.key}>
              {newDay && (
                <p className="relative bg-cream py-2 pl-1 text-[13px] font-semibold text-stone">
                  {d === today ? "오늘" : dayHeader(d)}
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpen(r.item.source)}
                className="press flex w-full items-start gap-3 py-2 text-left"
              >
                <div className="w-[78px] shrink-0 text-right">
                  <p className="text-[14px] tabular-nums text-ink">{hhmmOf(r.item.at)}</p>
                  {r.item.endAt != null && (
                    <p className="text-[12px] tabular-nums text-stone">~ {hhmmOf(r.item.endAt)}</p>
                  )}
                </div>
                <span
                  className="relative mt-[6px] h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-cream"
                  style={{ backgroundColor: c.face }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold" style={{ color: c.text }}>
                    {r.item.label}
                  </p>
                  {r.item.detail && <p className="truncate text-[13px] text-ink/80">{r.item.detail}</p>}
                </div>
              </button>
              {r.gapMs != null && r.gapMs >= 60_000 && (
                <div className="flex py-0.5">
                  <div className="w-[78px] shrink-0 text-right">
                    <span className="inline-block whitespace-nowrap rounded-full bg-card px-2.5 py-1 text-[12px] font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                      {durationLabel(r.gapMs)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setDays((n) => n + 7)}
          className="press mt-3 w-full rounded-full bg-card py-3 text-[15px] font-semibold text-leaf"
        >
          이전 7일 더 보기
        </button>
      )}
    </div>
  );
}
