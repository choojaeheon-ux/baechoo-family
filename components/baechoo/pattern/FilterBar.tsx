"use client";

import { EVENT_KINDS, KIND_COLOR, KIND_LABEL } from "@/lib/baechooEvents";
import type { KindFilter } from "@/lib/baechooPattern";
import { KindIcon } from "../record/icons";

export default function FilterBar({ filter, onChange }: { filter: KindFilter; onChange: (f: KindFilter) => void }) {
  const on = EVENT_KINDS.filter((k) => filter[k]).length;
  return (
    <div>
      <div className="flex justify-between px-1">
        {EVENT_KINDS.map((k) => {
          const active = filter[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filter, [k]: !active })}
              className="press flex w-[60px] flex-col items-center gap-1"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border-2"
                style={
                  active
                    ? { backgroundColor: KIND_COLOR[k].face, borderColor: KIND_COLOR[k].face, color: "#fff" }
                    : { borderColor: "var(--color-line)", color: KIND_COLOR[k].text }
                }
              >
                <KindIcon kind={k} className="h-5 w-5" />
              </span>
              <span className={`text-[12px] ${active ? "font-semibold text-ink" : "text-stone"}`}>{KIND_LABEL[k]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[12px] text-stone">5개 중 {on}개 선택됨</p>
    </div>
  );
}
