"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { newId } from "@/lib/repo";
import {
  Sheet,
  Field,
  inputCls,
  PrimaryButton,
} from "@/components/budget/ui";
import {
  PLAN_GROUP_LABEL,
  PNL_CLASS_LABEL,
  type PlanGroup,
  type PlanItem,
} from "@/lib/types";

// 숫자만 남긴다. type="number"는 iOS에서 글씨가 안 보여 쓰지 않는다.
const digits = (s: string) => s.replace(/[^0-9]/g, "");

export default function PlanItemForm({
  open,
  initial,
  draftGroup,
  draftConditional,
  onClose,
}: {
  open: boolean;
  initial: PlanItem | null;
  draftGroup: PlanGroup;
  draftConditional: boolean;
  onClose: () => void;
}) {
  const { savePlanItem, removePlanItem, planItems } = useData();

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [group, setGroup] = useState<PlanGroup>(initial?.group ?? draftGroup);
  const [pnlClass, setPnlClass] = useState<PlanItem["pnlClass"]>(
    initial?.pnlClass ?? "variable"
  );
  const [conditional, setConditional] = useState(
    initial?.conditional ?? draftConditional
  );
  const [endYearMonth, setEndYearMonth] = useState(initial?.endYearMonth ?? "");
  const [targetTotal, setTargetTotal] = useState(
    initial?.targetTotal == null ? "" : String(initial.targetTotal)
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = name.trim().length > 0 && Number(amount) > 0;

  const submit = async () => {
    if (!canSave) return;
    const maxSort = planItems.reduce((m, i) => Math.max(m, i.sortOrder), 0);
    await savePlanItem({
      id: initial?.id ?? newId(),
      group,
      name: name.trim(),
      amount: Number(amount),
      pnlClass,
      conditional,
      endYearMonth: endYearMonth || null,
      targetTotal: targetTotal ? Number(targetTotal) : null,
      note: note.trim() || null,
      sortOrder: initial?.sortOrder ?? maxSort + 10,
    });
    onClose();
  };

  const remove = async () => {
    if (!initial) return;
    await removePlanItem(initial.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "계획 항목 수정" : "계획 항목 추가"}
    >
      <Field label="항목명">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 식비"
        />
      </Field>

      <Field label="월 금액">
        <input
          className={inputCls}
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(digits(e.target.value))}
          placeholder="예: 700000"
        />
      </Field>

      <Field label="구획">
        <select
          className={inputCls}
          value={group}
          onChange={(e) => setGroup(e.target.value as PlanGroup)}
        >
          {(Object.keys(PLAN_GROUP_LABEL) as PlanGroup[]).map((g) => (
            <option key={g} value={g}>
              {PLAN_GROUP_LABEL[g]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="손익분류">
        <select
          className={inputCls}
          value={pnlClass}
          onChange={(e) =>
            setPnlClass(e.target.value as PlanItem["pnlClass"])
          }
        >
          {(
            Object.keys(PNL_CLASS_LABEL) as PlanItem["pnlClass"][]
          ).map((c) => (
            <option key={c} value={c}>
              {PNL_CLASS_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      <label className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={conditional}
          onChange={(e) => setConditional(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-leaf)]"
        />
        <span className="text-sm text-ink">
          여유 시 집행 — 부모급여·아동수당이 들어오면 집행
        </span>
      </label>

      <Field label="언제까지 (비우면 무기한)">
        <input
          className={inputCls}
          type="month"
          value={endYearMonth}
          onChange={(e) => setEndYearMonth(e.target.value)}
        />
      </Field>

      <Field label="잔액·목표액 (선택)">
        <input
          className={inputCls}
          type="text"
          inputMode="numeric"
          value={targetTotal}
          onChange={(e) => setTargetTotal(digits(e.target.value))}
          placeholder="예: 6264000"
        />
      </Field>

      <Field label="메모 (선택)">
        <input
          className={inputCls}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 아동수당으로 충당"
        />
      </Field>

      <div className="mt-4">
        <PrimaryButton onClick={submit} disabled={!canSave}>
          저장
        </PrimaryButton>
      </div>

      {initial &&
        (confirmDelete ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl border border-line py-2.5 text-sm text-stone"
            >
              취소
            </button>
            <button
              onClick={remove}
              className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-bold text-white"
            >
              삭제 확정
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-3 w-full py-2.5 text-center text-sm text-coral"
          >
            삭제
          </button>
        ))}
    </Sheet>
  );
}
