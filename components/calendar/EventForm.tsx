"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, nowHHMM } from "@/lib/format";
import type { FamilyEvent, EventRecurrence } from "@/lib/types";
import { EVENT_RECURRENCE_LABEL } from "@/lib/types";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";

// 삭제 버튼 (2단계 확인) — 배추/우주 폼과 동일 패턴
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-3 w-full py-2 text-sm text-coral"
      >
        삭제
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-center text-xs text-stone">
        삭제하면 휴지통으로 이동해요 (30일 후 자동 삭제)
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold text-stone"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex-1 rounded-xl bg-coral py-2 text-sm font-bold text-white"
        >
          삭제 확정
        </button>
      </div>
    </div>
  );
}

const RECURRENCES: EventRecurrence[] = ["none", "weekly", "monthly"];
// 반복 간격 라벨 (매주/매월 공통 — 1=매, 2=격, 3~4=N주기)
const INTERVAL_LABEL = (rec: EventRecurrence, n: number) => {
  const unit = rec === "weekly" ? "주" : "달";
  if (n === 1) return `매${unit === "주" ? "주" : "달"}`;
  if (n === 2) return `2${unit}마다 (격${unit === "주" ? "주" : "월"})`;
  return `${n}${unit}마다`;
};

export default function EventForm({
  open,
  onClose,
  initial,
  defaultDate,
  defaultEndDate,
  occurrenceDate,
}: {
  open: boolean;
  onClose: () => void;
  initial?: FamilyEvent;
  defaultDate?: string; // 신규: 시작일 기본값 (날짜 패널에서 열면 그 날)
  defaultEndDate?: string; // 신규: 종료일 기본값 (그리드 드래그로 열면 범위 끝)
  occurrenceDate?: string; // 반복 일정을 특정 회차에서 연 경우, 그 회차 시작일
}) {
  const { saveFamilyEvent, removeFamilyEvent, eventCategories } = useData();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? defaultDate ?? todayISO()
  );
  const [endDate, setEndDate] = useState(initial?.endDate ?? defaultEndDate ?? "");
  const [allDay, setAllDay] = useState(initial ? initial.time === null : true);
  const [time, setTime] = useState(initial?.time ?? nowHHMM());
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? eventCategories[0]?.id ?? "cat-together"
  );
  const [recurrence, setRecurrence] = useState<EventRecurrence>(
    initial?.recurrence ?? "none"
  );
  const [repeatInterval, setRepeatInterval] = useState(
    initial?.repeatInterval ?? 1
  );
  const [repeatUntil, setRepeatUntil] = useState(initial?.repeatUntil ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const valid =
    title.trim().length > 0 &&
    !!startDate &&
    (!endDate || endDate >= startDate) &&
    (recurrence === "none" || !repeatUntil || repeatUntil >= startDate);

  async function submit() {
    if (!valid) return;
    await saveFamilyEvent({
      id: initial?.id ?? "",
      title: title.trim(),
      startDate,
      endDate: endDate || null,
      time: allDay ? null : time || null,
      categoryId,
      memo: memo.trim() || null,
      recurrence,
      repeatInterval: recurrence === "none" ? 1 : repeatInterval,
      repeatUntil: recurrence === "none" ? null : repeatUntil || null,
      exceptions: initial?.exceptions ?? [],
      createdAt: initial?.createdAt ?? todayISO(),
    });
    onClose();
  }

  // 반복 일정에서 "이 회차만 삭제" — exceptions에 회차 시작일 추가
  async function skipThisOccurrence() {
    if (!initial || !occurrenceDate) return;
    await saveFamilyEvent({
      ...initial,
      exceptions: [...initial.exceptions, occurrenceDate],
    });
    onClose();
  }

  const showSkip =
    initial && initial.recurrence !== "none" && !!occurrenceDate;

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "일정 수정" : "일정 추가"}>
      <Field label="제목">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 우주 검진, 본가 방문, 결혼기념일"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="시작일">
          <input
            type="date"
            className={inputCls}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="종료일 (연박·선택)">
          <input
            type="date"
            className={inputCls}
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="시간">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-cream p-1">
            <button
              type="button"
              onClick={() => setAllDay(true)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                allDay ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              종일
            </button>
            <button
              type="button"
              onClick={() => setAllDay(false)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                !allDay ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              시간
            </button>
          </div>
          {!allDay && (
            <input
              type="time"
              className={inputCls}
              style={{ width: 130 }}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          )}
        </div>
      </Field>

      <Field label="카테고리">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {eventCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                categoryId === c.id ? "border-leaf bg-leaf-light text-ink" : "border-line text-stone"
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.emoji ? `${c.emoji} ` : ""}{c.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="반복">
        <div className="flex gap-1 rounded-xl bg-cream p-1">
          {RECURRENCES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecurrence(r)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${
                recurrence === r ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              {EVENT_RECURRENCE_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>

      {recurrence !== "none" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="간격">
            <select
              className={inputCls}
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 6].map((n) => (
                <option key={n} value={n}>
                  {INTERVAL_LABEL(recurrence, n)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="반복 종료일 (선택)">
            <input
              type="date"
              className={inputCls}
              value={repeatUntil}
              min={startDate}
              onChange={(e) => setRepeatUntil(e.target.value)}
            />
          </Field>
        </div>
      )}

      <Field label="메모 (선택)">
        <textarea
          className={inputCls}
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="장소·준비물 등"
        />
      </Field>

      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>

      {showSkip && (
        <button
          type="button"
          onClick={skipThisOccurrence}
          className="mt-3 w-full rounded-xl border border-line py-2 text-sm font-semibold text-stone"
        >
          이 회차만 삭제 ({Number(occurrenceDate!.slice(5, 7))}/
          {Number(occurrenceDate!.slice(8, 10))} 회차)
        </button>
      )}

      {initial && (
        <DeleteButton
          onDelete={async () => {
            await removeFamilyEvent(initial.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
