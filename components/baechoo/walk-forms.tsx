"use client";

import { nowHHMM } from "@/lib/format";
import { STOOL_STATES, STOOL_STATE_LABEL, type StoolState, type Stool } from "@/lib/types";
import { inputCls } from "@/components/budget/ui";

// 산책 안 응가 목록 편집 — 산책 상세 시트(record/sheets.tsx)가 지난 기록 수정에 쓴다
export function StoolEditor({
  stools,
  onChange,
}: {
  stools: Stool[];
  onChange: (s: Stool[]) => void;
}) {
  const update = (i: number, patch: Partial<Stool>) =>
    onChange(stools.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(stools.filter((_, idx) => idx !== i));
  const add = () => onChange([...stools, { state: "normal", time: nowHHMM(), lat: null, lng: null }]);

  return (
    <div className="space-y-2">
      {stools.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <select
            className={inputCls + " min-w-0 flex-1 pr-7 font-medium"}
            value={s.state}
            onChange={(e) => update(i, { state: e.target.value as StoolState })}
          >
            {STOOL_STATES.map((st) => (
              <option key={st} value={st}>
                {STOOL_STATE_LABEL[st]}
              </option>
            ))}
          </select>
          <input
            type="time"
            className={inputCls + " shrink-0 px-2 text-sm"}
            style={{ width: 118 }}
            value={s.time ?? ""}
            onChange={(e) => update(i, { time: e.target.value || null })}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 px-1.5 text-lg text-coral"
            aria-label="응가 삭제"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full press rounded-full bg-leaf-light py-2.5 text-[15px] font-semibold text-leaf-dark"
      >
        + 응가 추가
      </button>
    </div>
  );
}
