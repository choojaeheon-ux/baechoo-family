"use client";

import { EVENT_KINDS, KIND_COLOR, KIND_LABEL, type EventKind } from "@/lib/baechooEvents";
import { KindIcon } from "./icons";

export default function QuickButtons({
  onPress,
  busy,
}: {
  onPress: (k: EventKind) => void;
  busy: EventKind[];
}) {
  return (
    <div className="flex justify-between px-1">
      {EVENT_KINDS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onPress(k)}
          aria-label={`${KIND_LABEL[k]} 지금 기록`}
          className="press flex w-[60px] flex-col items-center gap-1.5"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity"
            style={{ backgroundColor: KIND_COLOR[k].face, opacity: busy.includes(k) ? 0.5 : 1 }}
          >
            <KindIcon kind={k} />
          </span>
          <span className="text-[13px] font-medium text-ink">{KIND_LABEL[k]}</span>
        </button>
      ))}
    </div>
  );
}
