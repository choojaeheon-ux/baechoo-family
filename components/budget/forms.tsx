"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { MEMBERS, type Budget, type Goal, type Member, type RecurringExpense, type Transaction, type TxType } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { Field, inputCls, PrimaryButton, Sheet } from "./ui";

/* ───────── 거래 입력 ───────── */
export function TransactionForm({
  open,
  onClose,
  initial,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Transaction;
  defaultDate?: string;
}) {
  const { categories, saveTransaction, removeTransaction } = useData();
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO());
  const [member, setMember] = useState<Member>(initial?.member ?? "chuchu");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const cats = categories.filter((c) => c.type === type);
  const amt = Number(amount.replace(/[^0-9]/g, ""));
  const valid = amt > 0 && (categoryId || cats[0]);

  async function submit() {
    if (!valid) return;
    await saveTransaction({
      id: initial?.id ?? "",
      date,
      amount: amt,
      type,
      categoryId: categoryId || cats[0].id,
      memo: memo || null,
      member,
      source: initial?.source ?? "manual",
      recurringId: initial?.recurringId ?? null,
      isPaid: true,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "내역 수정" : "내역 추가"}>
      <Toggle
        options={[
          { v: "expense", label: "지출" },
          { v: "income", label: "수입" },
        ]}
        value={type}
        onChange={(v) => {
          setType(v as TxType);
          setCategoryId("");
        }}
      />
      <div className="h-3" />
      <Field label="금액">
        <input
          className={inputCls + " text-right text-lg font-bold tabular"}
          inputMode="numeric"
          placeholder="0"
          value={amount ? Number(amt).toLocaleString("ko-KR") : ""}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="카테고리">
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                (categoryId || cats[0]?.id) === c.id
                  ? "border-leaf bg-leaf-light text-leaf-dark"
                  : "border-line text-stone"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </Field>
      <Field label="날짜">
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <Field label="입력자">
        <Toggle
          options={MEMBERS.map((m) => ({ v: m.id, label: `${m.emoji} ${m.name}` }))}
          value={member}
          onChange={(v) => setMember(v as Member)}
        />
      </Field>
      <Field label="메모 (선택)">
        <input
          className={inputCls}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 마트 장보기"
        />
      </Field>
      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial && (
        <button
          onClick={async () => {
            await removeTransaction(initial.id);
            onClose();
          }}
          className="mt-3 w-full py-2 text-sm text-coral"
        >
          삭제
        </button>
      )}
    </Sheet>
  );
}

/* ───────── 고정지출 / 할부 ───────── */
export function RecurringForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: RecurringExpense;
}) {
  const { categories, saveRecurring, removeRecurring } = useData();
  const cats = categories.filter((c) => c.type === "expense");
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "cat-saving");
  const [day, setDay] = useState(initial ? String(initial.dayOfMonth) : "25");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [isInstallment, setIsInstallment] = useState(initial?.isInstallment ?? false);
  const [totalMonths, setTotalMonths] = useState(
    initial?.installmentTotalMonths ? String(initial.installmentTotalMonths) : "12"
  );
  const [paidMonths, setPaidMonths] = useState(
    initial ? String(initial.installmentPaidMonths) : "0"
  );

  const amt = Number(amount.replace(/[^0-9]/g, ""));
  const valid = name.trim() && amt > 0 && Number(day) >= 1 && Number(day) <= 31;

  async function submit() {
    if (!valid) return;
    await saveRecurring({
      id: initial?.id ?? "",
      name: name.trim(),
      amount: amt,
      categoryId,
      dayOfMonth: Number(day),
      startDate,
      endDate: initial?.endDate ?? null,
      isInstallment,
      installmentTotalMonths: isInstallment ? Number(totalMonths) : null,
      installmentPaidMonths: isInstallment ? Number(paidMonths) : 0,
      memo: initial?.memo ?? null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "고정지출 수정" : "고정지출 추가"}>
      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 청약저축, 신한카드, 냉장고 할부"
        />
      </Field>
      <Field label="금액 (월)">
        <input
          className={inputCls + " text-right tabular"}
          inputMode="numeric"
          value={amount ? Number(amt).toLocaleString("ko-KR") : ""}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </Field>
      <Field label="카테고리">
        <select
          className={inputCls}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="매달 출금일">
          <input
            className={inputCls + " text-right tabular"}
            inputMode="numeric"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
        <Field label="시작일">
          <input
            type="date"
            className={inputCls}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
      </div>

      <label className="mb-3 flex items-center justify-between rounded-xl border border-line bg-cream px-3 py-2.5">
        <span className="text-sm font-semibold text-ink">🧾 할부 항목</span>
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-leaf)]"
          checked={isInstallment}
          onChange={(e) => setIsInstallment(e.target.checked)}
        />
      </label>

      {isInstallment && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="총 할부 개월">
            <input
              className={inputCls + " text-right tabular"}
              inputMode="numeric"
              value={totalMonths}
              onChange={(e) => setTotalMonths(e.target.value)}
            />
          </Field>
          <Field label="이미 낸 개월">
            <input
              className={inputCls + " text-right tabular"}
              inputMode="numeric"
              value={paidMonths}
              onChange={(e) => setPaidMonths(e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial && (
        <button
          onClick={async () => {
            await removeRecurring(initial.id);
            onClose();
          }}
          className="mt-3 w-full py-2 text-sm text-coral"
        >
          삭제
        </button>
      )}
    </Sheet>
  );
}

/* ───────── 예산 ───────── */
export function BudgetForm({
  open,
  onClose,
  ym,
}: {
  open: boolean;
  onClose: () => void;
  ym: string;
}) {
  const { categories, budgets, saveBudget } = useData();
  const cats = categories.filter((c) => c.type === "expense");
  const [scope, setScope] = useState<string>("__all__"); // __all__ or categoryId
  const [amount, setAmount] = useState("");

  const amt = Number(amount.replace(/[^0-9]/g, ""));

  async function submit() {
    if (amt <= 0) return;
    const categoryId = scope === "__all__" ? null : scope;
    const existing = budgets.find(
      (b) => b.yearMonth === ym && b.categoryId === categoryId
    );
    await saveBudget({
      id: existing?.id ?? "",
      yearMonth: ym,
      categoryId,
      amount: amt,
    } as Budget);
    setAmount("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="예산 설정">
      <Field label="대상">
        <select
          className={inputCls}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="__all__">전체 월예산</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="예산 금액">
        <input
          className={inputCls + " text-right tabular"}
          inputMode="numeric"
          value={amount ? Number(amt).toLocaleString("ko-KR") : ""}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </Field>
      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={amt <= 0}>
          저장
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ───────── 목표 ───────── */
export function GoalForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Goal;
}) {
  const { saveGoal, removeGoal } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? String(initial.targetAmount) : "");
  const [current, setCurrent] = useState(initial ? String(initial.currentAmount) : "0");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");

  const t = Number(target.replace(/[^0-9]/g, ""));
  const c = Number(current.replace(/[^0-9]/g, ""));
  const valid = name.trim() && t > 0;

  async function submit() {
    if (!valid) return;
    await saveGoal({
      id: initial?.id ?? "",
      name: name.trim(),
      targetAmount: t,
      currentAmount: c,
      deadline: deadline || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "목표 수정" : "목표 추가"}>
      <Field label="목표 이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 우주 출산준비금, 비상금 1000만원"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="목표 금액">
          <input
            className={inputCls + " text-right tabular"}
            inputMode="numeric"
            value={target ? Number(t).toLocaleString("ko-KR") : ""}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="현재 모은 금액">
          <input
            className={inputCls + " text-right tabular"}
            inputMode="numeric"
            value={current ? Number(c).toLocaleString("ko-KR") : ""}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="목표 기한 (선택)">
        <input
          type="date"
          className={inputCls}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </Field>
      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial && (
        <button
          onClick={async () => {
            await removeGoal(initial.id);
            onClose();
          }}
          className="mt-3 w-full py-2 text-sm text-coral"
        >
          삭제
        </button>
      )}
    </Sheet>
  );
}

/* ───────── 공용 토글 ───────── */
export function Toggle({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-cream p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            value === o.v ? "bg-card text-leaf-dark shadow-sm" : "text-stone"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
