"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO } from "@/lib/format";
import {
  MEAL_TYPE_LABEL,
  HEALTH_TYPES,
  HEALTH_TYPE_LABEL,
  EXAM_TYPE_LABEL,
  DENTAL_METHODS,
  CARE_ITEMS,
  type MealType,
  type HealthType,
  type ExamType,
  type BaechooMeal,
  type BaechooHealth,
  type BaechooExam,
} from "@/lib/types";
import { Sheet, Field, inputCls, PrimaryButton } from "@/components/budget/ui";

// 토글 버튼 그룹 (식사/간식, 체중측정/관리 등)
function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
            value === o.id
              ? "border-leaf bg-leaf text-white"
              : "border-line bg-cream text-stone"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 삭제 버튼 (수정 모드)
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      className="mt-3 w-full py-2 text-sm text-coral"
    >
      삭제
    </button>
  );
}

/* ───────────── 식사/간식 폼 ───────────── */
export function MealForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BaechooMeal;
}) {
  const { saveBaechooMeal, removeBaechooMeal } = useData();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [mealType, setMealType] = useState<MealType>(initial?.mealType ?? "meal");
  const [time, setTime] = useState(initial?.time ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [topping, setTopping] = useState(initial?.topping ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const isMeal = mealType === "meal";
  const valid = content.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await saveBaechooMeal({
      id: initial?.id ?? "",
      date,
      mealType,
      time: time || null,
      content: content.trim(),
      topping: isMeal ? topping.trim() || null : null,
      amount: amount.trim() || null,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "기록 수정" : "식사·간식 기록"}>
      <Field label="구분">
        <Toggle
          options={[
            { id: "meal", label: MEAL_TYPE_LABEL.meal },
            { id: "snack", label: MEAL_TYPE_LABEL.snack },
          ]}
          value={mealType}
          onChange={setMealType}
        />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="날짜">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="시간 (선택)">
            <input
              type="time"
              className={inputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <Field label={isMeal ? "사료종류" : "간식종류"}>
        <input
          className={inputCls}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isMeal ? "예: 닭가슴살 사료" : "예: 북어트릿"}
        />
      </Field>

      {isMeal && (
        <Field label="토핑종류 (선택)">
          <input
            className={inputCls}
            value={topping}
            onChange={(e) => setTopping(e.target.value)}
            placeholder="예: 황태채, 단호박"
          />
        </Field>
      )}

      <Field label="실제로 먹은 양 (선택)">
        <input
          className={inputCls}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="예: 100g, 다 먹음, 반만"
        />
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
      {initial && (
        <DeleteButton
          onDelete={async () => {
            await removeBaechooMeal(initial.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

/* ───────────── 건강 폼 ───────────── */
export function HealthForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BaechooHealth;
}) {
  const { saveBaechooHealth, removeBaechooHealth } = useData();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [healthType, setHealthType] = useState<HealthType>(
    initial?.healthType ?? "symptom"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const isDental = healthType === "dental";
  const showNext = ["hospital", "vaccine", "medicine"].includes(healthType);
  const valid = title.trim().length > 0;

  const titleLabel =
    healthType === "symptom"
      ? "증상"
      : healthType === "note"
      ? "특이사항"
      : healthType === "dental"
      ? "양치 방법"
      : "내용";
  const titlePlaceholder =
    healthType === "symptom"
      ? "예: 콧물, 오른쪽 뒷다리에 뭐 남"
      : healthType === "note"
      ? "예: 장거리 이동 (제주 왕복)"
      : healthType === "hospital"
      ? "예: 슬개골 정기 검진"
      : healthType === "vaccine"
      ? "예: 종합백신 3차"
      : healthType === "medicine"
      ? "예: 심장사상충 예방약"
      : "내용을 적어주세요";

  async function submit() {
    if (!valid) return;
    await saveBaechooHealth({
      id: initial?.id ?? "",
      date,
      healthType,
      title: title.trim(),
      nextDate: showNext ? nextDate || null : null,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "기록 수정" : "건강 기록"}>
      <Field label="종류">
        <select
          className={inputCls}
          value={healthType}
          onChange={(e) => setHealthType(e.target.value as HealthType)}
        >
          {HEALTH_TYPES.map((t) => (
            <option key={t} value={t}>
              {HEALTH_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="날짜">
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      {isDental && (
        <Field label="빠른 선택">
          <div className="flex gap-1">
            {DENTAL_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTitle(m)}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                  title === m
                    ? "border-leaf bg-leaf text-white"
                    : "border-line bg-cream text-stone"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label={titleLabel}>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
        />
      </Field>

      {showNext && (
        <Field label="다음 예정일 (선택)">
          <input
            type="date"
            className={inputCls}
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </Field>
      )}

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
      {initial && (
        <DeleteButton
          onDelete={async () => {
            await removeBaechooHealth(initial.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

/* ───────────── 신체검사 폼 ───────────── */
export function ExamForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BaechooExam;
}) {
  const { saveBaechooExam, removeBaechooExam } = useData();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [examType, setExamType] = useState<ExamType>(initial?.examType ?? "measure");
  const [weight, setWeight] = useState(
    initial?.weight != null ? String(initial.weight) : ""
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const isMeasure = examType === "measure";
  const weightNum = Number(weight);
  const valid = isMeasure
    ? weight.trim().length > 0 && weightNum > 0
    : content.trim().length > 0;

  function toggleCare(item: string) {
    const parts = content
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes(item)) {
      setContent(parts.filter((p) => p !== item).join(", "));
    } else {
      setContent([...parts, item].join(", "));
    }
  }

  async function submit() {
    if (!valid) return;
    await saveBaechooExam({
      id: initial?.id ?? "",
      date,
      examType,
      weight: isMeasure ? weightNum : null,
      content: isMeasure ? null : content.trim() || null,
      memo: memo.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "기록 수정" : "신체검사 기록"}>
      <Field label="구분">
        <Toggle
          options={[
            { id: "measure", label: EXAM_TYPE_LABEL.measure },
            { id: "care", label: EXAM_TYPE_LABEL.care },
          ]}
          value={examType}
          onChange={setExamType}
        />
      </Field>

      <Field label="날짜">
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      {isMeasure ? (
        <Field label="체중 (kg)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            className={inputCls}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="예: 4.2"
          />
        </Field>
      ) : (
        <>
          <Field label="빠른 선택">
            <div className="flex flex-wrap gap-1">
              {CARE_ITEMS.map((item) => {
                const on = content
                  .split(",")
                  .map((s) => s.trim())
                  .includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleCare(item)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      on
                        ? "border-leaf bg-leaf text-white"
                        : "border-line bg-cream text-stone"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="관리 내용">
            <input
              className={inputCls}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 목욕, 발톱미용"
            />
          </Field>
        </>
      )}

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
      {initial && (
        <DeleteButton
          onDelete={async () => {
            await removeBaechooExam(initial.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
