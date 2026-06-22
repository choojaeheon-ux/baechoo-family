"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, nowHHMM } from "@/lib/format";
import { formatDuration, formatDistance } from "@/lib/geo";
import {
  STOOL_STATES,
  STOOL_STATE_LABEL,
  type StoolState,
  type Stool,
  type BaechooWalk,
} from "@/lib/types";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";
import WalkMap from "./WalkMap";

// 추적 종료 후 넘어오는 임시 데이터
export interface WalkDraft {
  date: string;
  startTime: string | null;
  durationSec: number;
  distanceM: number;
  route: { lat: number; lng: number }[];
  stools: Stool[];
}

// ISO → 로컬 HH:MM
function startHHMM(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button onClick={onDelete} className="mt-3 w-full py-2 text-sm text-coral">
      삭제
    </button>
  );
}

// 소요·거리·응가 요약
function WalkStats({
  durationSec,
  distanceM,
  stoolCount,
}: {
  durationSec: number;
  distanceM: number;
  stoolCount: number;
}) {
  const cell = "rounded-xl bg-cream py-2.5 text-center";
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      <div className={cell}>
        <p className="text-[11px] text-stone">소요</p>
        <p className="text-sm font-bold text-ink">{formatDuration(durationSec)}</p>
      </div>
      <div className={cell}>
        <p className="text-[11px] text-stone">거리</p>
        <p className="text-sm font-bold text-ink">{formatDistance(distanceM)}</p>
      </div>
      <div className={cell}>
        <p className="text-[11px] text-stone">응가</p>
        <p className="text-sm font-bold text-ink">{stoolCount}회</p>
      </div>
    </div>
  );
}

// 응가 목록 편집 (저장·수동·상세 공용)
export function StoolEditor({
  stools,
  onChange,
}: {
  stools: Stool[];
  onChange: (s: Stool[]) => void;
}) {
  const update = (i: number, patch: Partial<Stool>) =>
    onChange(stools.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) =>
    onChange(stools.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...stools,
      { state: "normal", time: nowHHMM(), lat: null, lng: null },
    ]);

  return (
    <div className="space-y-2">
      {stools.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <select
            className={inputCls + " min-w-0 flex-1 pr-7 font-medium"}
            value={s.state}
            onChange={(e) =>
              update(i, { state: e.target.value as StoolState })
            }
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
        className="w-full rounded-xl border border-dashed border-leaf py-2 text-sm font-semibold text-leaf-dark active:scale-[0.99]"
      >
        + 응가 추가
      </button>
    </div>
  );
}

/* ───────────── 추적 종료 후 저장 시트 ───────────── */
export function WalkSaveSheet({
  open,
  onClose,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  draft: WalkDraft;
}) {
  const { saveBaechooWalk } = useData();
  const [stools, setStools] = useState<Stool[]>(draft.stools);
  const [memo, setMemo] = useState("");

  async function submit() {
    await saveBaechooWalk({
      id: "",
      date: draft.date,
      startTime: draft.startTime,
      durationSec: draft.durationSec,
      distanceM: draft.distanceM,
      route: draft.route,
      stools,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="산책 저장">
      <WalkStats
        durationSec={draft.durationSec}
        distanceM={draft.distanceM}
        stoolCount={stools.length}
      />
      {draft.route.length > 1 && (
        <WalkMap
          route={draft.route}
          stools={stools}
          pawTrail
          className="mb-4 h-44 w-full overflow-hidden rounded-xl border border-line"
        />
      )}
      <Field label="응가 기록">
        <StoolEditor stools={stools} onChange={setStools} />
      </Field>
      <Field label="메모 (선택)">
        <textarea
          className={inputCls + " min-h-16 resize-none"}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Field>
      <div className="mt-2">
        <PrimaryButton onClick={submit}>저장</PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ───────────── 수동 입력 (과거 산책) ───────────── */
export function WalkManualForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { saveBaechooWalk } = useData();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [durationMin, setDurationMin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [stools, setStools] = useState<Stool[]>([]);
  const [memo, setMemo] = useState("");

  const valid = Number(durationMin) > 0;

  async function submit() {
    if (!valid) return;
    const startTime = time ? new Date(`${date}T${time}`).toISOString() : null;
    await saveBaechooWalk({
      id: "",
      date,
      startTime,
      durationSec: Math.round(Number(durationMin) * 60),
      distanceM: distanceKm ? Math.round(Number(distanceKm) * 1000) : 0,
      route: [],
      stools,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="산책 수동 입력">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Field label="날짜">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <div className="min-w-0 flex-1">
          <Field label="시작 시간 (선택)">
            <input
              type="time"
              className={inputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Field label="소요 (분)">
            <input
              type="text"
              inputMode="numeric"
              className={inputCls}
              value={durationMin}
              onChange={(e) =>
                setDurationMin(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="예: 30"
            />
          </Field>
        </div>
        <div className="min-w-0 flex-1">
          <Field label="거리 (km, 선택)">
            <input
              type="text"
              inputMode="decimal"
              className={inputCls}
              value={distanceKm}
              onChange={(e) =>
                setDistanceKm(
                  e.target.value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1")
                )
              }
              placeholder="예: 1.2"
            />
          </Field>
        </div>
      </div>

      <Field label="응가 기록 (선택)">
        <StoolEditor stools={stools} onChange={setStools} />
      </Field>
      <Field label="메모 (선택)">
        <textarea
          className={inputCls + " min-h-16 resize-none"}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Field>

      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ───────────── 상세 (보기 + 편집 + 삭제) ───────────── */
export function WalkDetailSheet({
  open,
  onClose,
  walk,
}: {
  open: boolean;
  onClose: () => void;
  walk: BaechooWalk;
}) {
  const { saveBaechooWalk, removeBaechooWalk } = useData();
  const [stools, setStools] = useState<Stool[]>(walk.stools);
  const [memo, setMemo] = useState(walk.memo ?? "");

  const hasMap =
    walk.route.length > 1 || stools.some((s) => s.lat != null && s.lng != null);

  async function save() {
    await saveBaechooWalk({ ...walk, stools, memo: memo.trim() || null });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="산책 상세">
      <WalkStats
        durationSec={walk.durationSec}
        distanceM={walk.distanceM}
        stoolCount={stools.length}
      />
      {walk.startTime && (
        <p className="mb-3 text-xs text-stone">
          시작 {startHHMM(walk.startTime)}
        </p>
      )}
      {hasMap && (
        <WalkMap
          route={walk.route}
          stools={stools}
          pawTrail
          className="mb-4 h-56 w-full overflow-hidden rounded-xl border border-line"
        />
      )}
      <Field label="응가 기록">
        <StoolEditor stools={stools} onChange={setStools} />
      </Field>
      <Field label="메모">
        <textarea
          className={inputCls + " min-h-16 resize-none"}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Field>
      <div className="mt-2">
        <PrimaryButton onClick={save}>저장</PrimaryButton>
      </div>
      <DeleteButton
        onDelete={async () => {
          await removeBaechooWalk(walk.id);
          onClose();
        }}
      />
    </Sheet>
  );
}

export { startHHMM };
