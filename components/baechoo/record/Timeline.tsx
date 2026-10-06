"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/format";
import {
  KIND_COLOR,
  ampmLabel,
  dayHeader,
  daySummary,
  groupByDay,
  hhmmOf,
  summaryLabel,
  type BaechooEvent,
  type EventSource,
} from "@/lib/baechooEvents";
import { Empty } from "@/components/budget/ui";
import { IconChevron } from "@/components/ios";

function Row({ e, onOpen }: { e: BaechooEvent; onOpen: (s: EventSource) => void }) {
  const c = KIND_COLOR[e.kind];
  return (
    <button
      type="button"
      onClick={() => onOpen(e.source)}
      className="press flex w-full items-start gap-3 border-b border-separator px-4 py-3 text-left last:border-b-0"
    >
      <div className="w-[78px] shrink-0 pt-0.5">
        <p className="text-[14px] font-medium tabular-nums text-ink">
          {e.startAt != null ? ampmLabel(e.startAt) : "시각 없음"}
        </p>
        {e.endAt != null && <p className="text-[12px] tabular-nums text-stone">~ {hhmmOf(e.endAt)}</p>}
      </div>
      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.face }} />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold" style={{ color: c.text }}>
          {e.label}
        </p>
        {e.detail && <p className="truncate text-[14px] text-ink/80">{e.detail}</p>}
      </div>
      <IconChevron dir="right" className="mt-1 h-4 w-4 shrink-0 text-stone/60" />
    </button>
  );
}

export default function Timeline({
  events,
  today,
  onOpen,
}: {
  events: BaechooEvent[];
  today: string;
  onOpen: (s: EventSource) => void;
}) {
  const [days, setDays] = useState(7);
  const groups = useMemo(() => groupByDay(events), [events]);
  const cutoff = addDays(today, -(days - 1));
  const shown = groups.filter((g) => g.date >= cutoff);
  const hasMore = groups.some((g) => g.date < cutoff);

  if (groups.length === 0) {
    return <Empty>아직 기록이 없어요. 위 버튼을 눌러 시작해 보세요.</Empty>;
  }
  return (
    <div className="space-y-5">
      {shown.map((g) => (
        <section key={g.date}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
            <h3 className="shrink-0 text-[15px] font-semibold text-ink">
              {g.date === today ? `오늘 · ${dayHeader(g.date)}` : dayHeader(g.date)}
            </h3>
            <span className="truncate text-[12px] text-stone">{summaryLabel(daySummary(events, g.date))}</span>
          </div>
          <div className="overflow-hidden rounded-[22px] bg-card">
            {[...g.timed, ...g.untimed].map((e) => (
              <Row key={e.key} e={e} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setDays((d) => d + 7)}
          className="press w-full rounded-full bg-card py-3 text-[15px] font-semibold text-leaf"
        >
          이전 7일 더 보기
        </button>
      )}
    </div>
  );
}
