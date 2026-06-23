"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO } from "@/lib/format";
import type { UjuChecklist } from "@/lib/types";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";

// 삭제 버튼 (2단계 확인) — 배추 폼과 동일 패턴
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

/* ───────────── 우주 체크리스트 폼 ───────────── */
export function UjuChecklistForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: UjuChecklist;
}) {
  const { saveUjuChecklist, removeUjuChecklist } = useData();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayISO());
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const valid = title.trim().length > 0 && !!dueDate;

  async function submit() {
    if (!valid) return;
    await saveUjuChecklist({
      id: initial?.id ?? "",
      title: title.trim(),
      dueDate,
      done: initial?.done ?? false,
      completedAt: initial?.completedAt ?? null,
      memo: memo.trim() || null,
      createdAt: initial?.createdAt ?? todayISO(),
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "체크리스트 수정" : "체크리스트 추가"}>
      <Field label="할 일">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: BCG 예방접종, 출생신고, 카시트 구매"
        />
      </Field>

      <Field label="기한">
        <input
          type="date"
          className={inputCls}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </Field>

      <Field label="메모 (선택)">
        <textarea
          className={inputCls}
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="준비물·장소·참고사항 등"
        />
      </Field>

      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial && (
        <DeleteButton
          onDelete={async () => {
            await removeUjuChecklist(initial.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
