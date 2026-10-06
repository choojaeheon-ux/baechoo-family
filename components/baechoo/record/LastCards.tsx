"use client";

import { STOOL_STATE_LABEL } from "@/lib/types";
import {
  KIND_COLOR,
  durationLabel,
  elapsedLabel,
  lastOf,
  lastStool,
  type BaechooEvent,
  type EventKind,
} from "@/lib/baechooEvents";

function Cell({ title, kind, value, sub }: { title: string; kind: EventKind; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-[18px] bg-card px-3 py-3 text-center">
      <p className="text-[12px] text-stone">{title}</p>
      <p className="mt-0.5 truncate text-[16px] font-semibold" style={{ color: KIND_COLOR[kind].text }}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[12px] text-stone">{sub || " "}</p>
    </div>
  );
}

export default function LastCards({ events, now }: { events: BaechooEvent[]; now: number }) {
  const meal = lastOf(events, "meal", now);
  const walk = lastOf(events, "walk", now);
  const stool = lastStool(events, now);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Cell
        title="마지막 식사"
        kind="meal"
        value={meal?.startAt != null ? elapsedLabel(meal.startAt, now) : "기록 없음"}
        sub={meal?.detail ?? ""}
      />
      <Cell
        title="마지막 산책"
        kind="walk"
        value={walk?.startAt != null ? elapsedLabel(walk.endAt ?? walk.startAt, now) : "기록 없음"}
        sub={
          walk?.startAt != null
            ? walk.endAt != null
              ? durationLabel(walk.endAt - walk.startAt)
              : "끝난 시각 미입력"
            : ""
        }
      />
      <Cell
        title="마지막 응가"
        kind="stool"
        value={stool ? elapsedLabel(stool.at, now) : "기록 없음"}
        sub={stool ? STOOL_STATE_LABEL[stool.state] : ""}
      />
    </div>
  );
}
