"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  COST_TYPES,
  COST_TYPE_LABEL,
  PAYMENT_KIND_LABEL,
  RECURRING_KIND_LABEL,
  type Budget,
  type BudgetVersion,
  type Category,
  type CostType,
  type Goal,
  type LocalCurrency,
  type PaymentMethod,
  type RecurringExpense,
  type RecurringKind,
  type RewardRule,
  type Transaction,
  type TxType,
} from "@/lib/types";
import { currentYearMonth, shiftMonth, todayISO, won } from "@/lib/format";
import { Field, inputCls, PrimaryButton, Sheet } from "./ui";

/* ───────── 거래 입력 ─────────
   입력 순서: 지출/수입 → 계정 과목 → 금액 → 거래처 → 내용 → 결제 수단 → 날짜
   결제 수단은 결제수단 + 지역화폐/바우처/상품권을 한 드롭다운에서 고른다.
   ("pm:<id>" = 결제수단, "lc:<id>" = 지역화폐 — 지역화폐를 고르면 잔액이 자동 차감된다) */
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
  const {
    categories,
    paymentMethods,
    localCurrencies,
    saveTransaction,
    removeTransaction,
  } = useData();
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO());
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [payment, setPayment] = useState(
    initial?.localCurrencyId
      ? `lc:${initial.localCurrencyId}`
      : initial?.paymentMethodId
        ? `pm:${initial.paymentMethodId}`
        : ""
  );

  const cats = categories.filter((c) => c.type === type);
  const amt = Number(amount.replace(/[^0-9]/g, ""));
  // 계정 과목은 반드시 선택해야 한다(기본값 자동 선택 없음)
  const valid = amt > 0 && !!categoryId && cats.some((c) => c.id === categoryId);

  const lcId = payment.startsWith("lc:") ? payment.slice(3) : null;
  const pmId = payment.startsWith("pm:") ? payment.slice(3) : null;
  const selectedLc = lcId ? localCurrencies.find((l) => l.id === lcId) : null;

  async function submit() {
    if (!valid) return;
    await saveTransaction({
      id: initial?.id ?? "",
      date,
      amount: amt,
      type,
      categoryId,
      merchant: merchant.trim() || null,
      memo: memo.trim() || null,
      member: initial?.member ?? "chuchu",
      paymentMethodId: pmId,
      localCurrencyId: lcId,
      isSpecial: initial?.isSpecial ?? false,
      habitTag: initial?.habitTag ?? null,
      source: initial?.source ?? "manual",
      recurringId: initial?.recurringId ?? null,
      isPaid: true,
      createdAt: initial?.createdAt ?? "",
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
      <Field label="계정 과목">
        <select
          className={inputCls}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">선택하세요</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.groupName ? `${c.groupName} · ` : ""}
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="금액">
        <input
          className={inputCls + " text-right text-lg font-bold tabular"}
          inputMode="numeric"
          placeholder="0"
          value={amount ? Number(amt).toLocaleString("ko-KR") : ""}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="거래처">
        <input
          className={inputCls}
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="예: 이마트, 스타벅스"
        />
      </Field>
      <Field label="내용">
        <input
          className={inputCls}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 마트 장보기"
        />
      </Field>
      <Field label="결제 수단">
        <select
          className={inputCls}
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
        >
          <option value="">선택 안함</option>
          {paymentMethods.length > 0 && (
            <optgroup label="결제수단">
              {paymentMethods.map((p) => (
                <option key={p.id} value={`pm:${p.id}`}>
                  {p.name} ({PAYMENT_KIND_LABEL[p.kind]})
                </option>
              ))}
            </optgroup>
          )}
          {localCurrencies.length > 0 && (
            <optgroup label="지역화폐 · 바우처 · 상품권">
              {localCurrencies.map((l) => (
                <option key={l.id} value={`lc:${l.id}`}>
                  🎟️ {l.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>
      {selectedLc && type === "expense" && (
        <p className="-mt-1 mb-3 text-[11px] text-stone">
          저장하면 {selectedLc.name} 잔액 {won(selectedLc.balance)}에서 자동 차감됩니다.
        </p>
      )}
      <Field label="날짜">
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => setDate(e.target.value)}
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

/* ───────── 고정지출 / 구독 / 할부·대출 ───────── */
export function RecurringForm({
  open,
  onClose,
  initial,
  defaultKind,
}: {
  open: boolean;
  onClose: () => void;
  initial?: RecurringExpense;
  defaultKind?: RecurringKind;
}) {
  const { categories, paymentMethods, saveRecurring, removeRecurring } = useData();
  const cats = categories.filter((c) => c.type === "expense");
  const [kind, setKind] = useState<RecurringKind>(
    initial?.kind ?? defaultKind ?? "fixed"
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  // 기본값을 특정 과목으로 박아두면 그 과목이 지워졌을 때 없는 id가 그대로 저장된다.
  // 거래 입력 폼과 같이 "직접 고르게" 한다.
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [day, setDay] = useState(initial ? String(initial.dayOfMonth) : "25");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [paymentMethodId, setPaymentMethodId] = useState(
    initial?.paymentMethodId ?? ""
  );
  const [totalMonths, setTotalMonths] = useState(
    initial?.installmentTotalMonths ? String(initial.installmentTotalMonths) : "12"
  );
  const [paidMonths, setPaidMonths] = useState(
    initial ? String(initial.installmentPaidMonths) : "0"
  );

  const amt = Number(amount.replace(/[^0-9]/g, ""));
  // 계정 과목은 지금 존재하는 것만 통과시킨다 — 지워진 과목 id로 저장되면 조용히 유실된다
  const valid =
    name.trim() &&
    amt > 0 &&
    Number(day) >= 1 &&
    Number(day) <= 31 &&
    cats.some((c) => c.id === categoryId);

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
      kind,
      paymentMethodId: paymentMethodId || null,
      installmentTotalMonths: kind === "installment" ? Number(totalMonths) : null,
      installmentPaidMonths: kind === "installment" ? Number(paidMonths) : 0,
      memo: initial?.memo ?? null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "항목 수정" : "항목 추가"}
    >
      <Field label="종류">
        <Toggle
          options={(["fixed", "subscription", "installment"] as RecurringKind[]).map(
            (k) => ({ v: k, label: RECURRING_KIND_LABEL[k] })
          )}
          value={kind}
          onChange={(v) => setKind(v as RecurringKind)}
        />
      </Field>
      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            kind === "subscription"
              ? "예: 넷플릭스, 유튜브 프리미엄"
              : kind === "installment"
                ? "예: 냉장고 할부, 전세대출"
                : "예: 청약저축, 통신비"
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="금액 (월)">
          <input
            className={inputCls + " text-right tabular"}
            inputMode="numeric"
            value={amount ? Number(amt).toLocaleString("ko-KR") : ""}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="결제일 (매달)">
          <input
            className={inputCls + " text-right tabular"}
            inputMode="numeric"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
      </div>
      <Field label="카테고리">
        <select
          className={inputCls}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">선택하세요</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.groupName ? `${c.groupName} · ` : ""}
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="결제수단 (카드)">
        <select
          className={inputCls}
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
        >
          <option value="">선택 안함</option>
          {paymentMethods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({PAYMENT_KIND_LABEL[p.kind]})
            </option>
          ))}
        </select>
      </Field>

      {kind === "installment" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="총 개월 (할부/대출)">
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
  versionId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  versionId: string;
  initial?: Budget;
}) {
  const { categories, budgets, saveBudget } = useData();
  const cats = categories.filter((c) => c.type === "expense");
  // 구버전 "전체 월예산"(categoryId=null) 행을 편집할 때만 그 선택지를 남긴다.
  const legacyOverall = !!initial && initial.categoryId === null;
  const [scope, setScope] = useState<string>(
    initial ? (initial.categoryId ?? "__all__") : ""
  );
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");

  const amt = Number(amount.replace(/[^0-9]/g, ""));
  const valid = amt > 0 && scope !== "";

  async function submit() {
    if (!valid) return;
    const categoryId = scope === "__all__" ? null : scope;
    // 같은 버전 안에서 같은 과목의 행은 하나뿐이다.
    const existing = budgets.find(
      (b) => b.versionId === versionId && b.categoryId === categoryId
    );
    await saveBudget({
      id: existing?.id ?? "",
      yearMonth: null,
      categoryId,
      amount: amt,
      versionId,
    });
    setAmount("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="계정 과목 예산 설정">
      <Field label="계정 과목">
        <select
          className={inputCls}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="">선택하세요</option>
          {legacyOverall && <option value="__all__">전체 월예산 (구버전)</option>}
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.groupName ? `${c.groupName} · ` : ""}
              {c.name}
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
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ───────── 예산 버전 ───────── */
export function BudgetVersionForm({
  open,
  onClose,
  initial,
  duplicateFrom,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  initial?: BudgetVersion; // 수정
  duplicateFrom?: BudgetVersion; // 복제 — 이 버전의 예산 행까지 복사한다
  onCreated?: (id: string) => void; // 복제로 새로 생긴 버전 id — 호출부가 선택을 옮긴다
}) {
  const { budgetVersions, budgets, saveBudgetVersion, removeBudgetVersion, duplicateBudgetVersion } =
    useData();
  const [name, setName] = useState(
    initial?.name ?? (duplicateFrom ? `${duplicateFrom.name} 복사본` : "")
  );
  const [startMonth, setStartMonth] = useState(
    initial?.startMonth ?? shiftMonth(currentYearMonth(), 1)
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const valid = name.trim() !== "" && /^\d{4}-\d{2}$/.test(startMonth);

  // 이미 적용된 버전은 지울 수 없다 — 지난 달의 숫자가 통째로 바뀐다.
  const started = !!initial && initial.startMonth <= currentYearMonth();
  const canDelete = !!initial && !started && budgetVersions.length > 1;
  const rowCount = initial
    ? budgets.filter((b) => b.versionId === initial.id).length
    : 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      if (duplicateFrom) {
        const id = await duplicateBudgetVersion(duplicateFrom.id, name.trim(), startMonth);
        onCreated?.(id);
      } else {
        await saveBudgetVersion({
          id: initial?.id ?? "",
          name: name.trim(),
          startMonth,
          memo: initial?.memo ?? null,
          createdAt: initial?.createdAt ?? new Date().toISOString(),
        });
      }
      onClose();
    } catch (err) {
      // 버전 insert 실패는 예산 행까지 연쇄로 실패한다 — 조용히 닫지 않고 시트를 열어둔다.
      console.error("예산 버전 저장 실패:", err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={duplicateFrom ? "예산 버전 복제" : initial ? "예산 버전 수정" : "예산 버전 추가"}
    >
      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 8월 기준"
        />
      </Field>
      <Field label="시작 월">
        <input
          type="month"
          className={inputCls}
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />
      </Field>
      {saveError && (
        <p className="mb-2 text-xs text-coral">
          저장에 실패했어요. 다시 시도해 주세요.
        </p>
      )}
      <PrimaryButton onClick={submit} disabled={!valid || saving}>
        {duplicateFrom ? "복제" : "저장"}
      </PrimaryButton>
      {initial && (
        <button
          type="button"
          disabled={!canDelete}
          onClick={() => {
            if (
              window.confirm(
                `${initial.name} 버전과 그 안의 예산 ${rowCount}건을 삭제할까요?`
              )
            ) {
              removeBudgetVersion(initial.id)
                .then(onClose)
                .catch((err) => console.error("버전 삭제 실패:", err));
            }
          }}
          className={`mt-3 w-full py-2 text-sm ${
            canDelete ? "text-coral" : "text-stone/50"
          }`}
        >
          {canDelete
            ? "버전 삭제"
            : budgetVersions.length <= 1
              ? "마지막 버전은 삭제할 수 없어요"
              : "이미 적용된 버전은 삭제할 수 없어요"}
        </button>
      )}
    </Sheet>
  );
}

/* ───────── 연간 목표 ───────── */
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
          placeholder="예: 비상금 500만원, 여행자금 200만원"
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

/* ───────── 계정 과목 관리 ───────── */
export function CategoryForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Category;
}) {
  const { categories, saveCategory, removeCategory } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [costType, setCostType] = useState<CostType>(
    initial?.costType ?? "variable"
  );
  // 그룹(상위 카테고리): 이미 쓰는 이름은 골라 쓰고, 없으면 새로 적는다
  const [groupName, setGroupName] = useState(initial?.groupName ?? "");
  const [newGroup, setNewGroup] = useState(false);

  const knownGroups = [
    ...new Set(
      categories
        .filter((c) => c.type === type && c.groupName)
        .map((c) => c.groupName!)
    ),
  ].sort((a, b) => a.localeCompare(b));

  // 지출 계정과목은 고정비/변동비를 반드시 갖는다. 수입은 해당 없음(null).
  const valid = name.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await saveCategory({
      id: initial?.id ?? "",
      name: name.trim(),
      type,
      groupName: groupName.trim() || null,
      costType: type === "expense" ? costType : null,
      // 색·아이콘은 더 이상 지정하지 않는다. 기존 값은 그대로 두고, 신규는 유형 색만 쓴다.
      color: initial?.color ?? (type === "expense" ? "#e07a5f" : "#5c93a8"),
      icon: initial?.icon,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "계정 과목 수정" : "계정 과목 추가"}
    >
      <Field label="구분">
        <Toggle
          options={[
            { v: "expense", label: "지출" },
            { v: "income", label: "수입" },
          ]}
          value={type}
          onChange={(v) => {
            setType(v as TxType);
            setGroupName("");
            setNewGroup(false);
          }}
        />
      </Field>
      <Field label="카테고리 (상위 분류)">
        {newGroup || knownGroups.length === 0 ? (
          <input
            className={inputCls}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="예: 수도광열비, 제세공과금"
          />
        ) : (
          <select
            className={inputCls}
            value={groupName}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setGroupName("");
                setNewGroup(true);
              } else setGroupName(e.target.value);
            }}
          >
            <option value="">미분류</option>
            {knownGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="__new__">+ 새 카테고리 입력…</option>
          </select>
        )}
      </Field>
      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 전기, 가스, 수도"
        />
      </Field>
      {type === "expense" && (
        <Field label="성격 (손익 분류)">
          <select
            className={inputCls}
            value={costType}
            onChange={(e) => setCostType(e.target.value as CostType)}
          >
            {COST_TYPES.map((c) => (
              <option key={c} value={c}>
                {COST_TYPE_LABEL[c]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-stone">
            {costType === "saving"
              ? "비용이 아니라 먼저 떼어두는 돈으로 잡힙니다(손익의 선저축)."
              : costType === "excluded"
                ? "손익 계산에서 빠집니다(카드값처럼 이중으로 잡히는 항목)."
                : "손익 탭의 고정비·변동비가 이 설정을 그대로 씁니다."}
          </span>
        </Field>
      )}
      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial && (
        <button
          onClick={async () => {
            await removeCategory(initial.id);
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

/* ───────── 결제수단 관리 ───────── */
export function PaymentMethodForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: PaymentMethod;
}) {
  const { savePaymentMethod, removePaymentMethod } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<PaymentMethod["kind"]>(initial?.kind ?? "card");

  const valid = name.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await savePaymentMethod({ id: initial?.id ?? "", name: name.trim(), kind });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "결제수단 수정" : "결제수단 추가"}>
      <Field label="종류">
        <Toggle
          options={(["card", "cash", "account"] as PaymentMethod["kind"][]).map((k) => ({
            v: k,
            label: PAYMENT_KIND_LABEL[k],
          }))}
          value={kind}
          onChange={(v) => setKind(v as PaymentMethod["kind"])}
        />
      </Field>
      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 신한카드, 삼성카드, 국민은행"
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
            await removePaymentMethod(initial.id);
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

/* ───────── 지역화폐 · 바우처 · 상품권 ───────── */
export function LocalCurrencyForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: LocalCurrency;
}) {
  const { transactions, saveLocalCurrency, removeLocalCurrency } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "0");
  const [monthly, setMonthly] = useState(
    initial ? String(initial.monthlyCharge) : "0"
  );

  const bal = Number(balance.replace(/[^0-9]/g, ""));
  const mon = Number(monthly.replace(/[^0-9]/g, ""));
  const valid = name.trim().length > 0;

  // 이 지역화폐로 결제한 거래 수 — 있으면 삭제를 막는다(거래가 고아가 되므로)
  const linked = initial
    ? transactions.filter((t) => t.localCurrencyId === initial.id).length
    : 0;

  async function submit() {
    if (!valid) return;
    await saveLocalCurrency({
      id: initial?.id ?? "",
      name: name.trim(),
      balance: bal,
      monthlyCharge: mon,
      defaultCategoryId: initial?.defaultCategoryId ?? null,
      defaultPaymentMethodId: initial?.defaultPaymentMethodId ?? null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "지역화폐 수정" : "지역화폐 추가"}
    >
      <Field label="이름">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 온누리상품권, 경기지역화폐, 문화상품권"
        />
      </Field>
      <Field label="매월 충전금">
        <input
          className={inputCls + " text-right tabular"}
          inputMode="numeric"
          value={monthly ? Number(mon).toLocaleString("ko-KR") : ""}
          onChange={(e) => setMonthly(e.target.value)}
          placeholder="0"
        />
      </Field>
      <Field label="현재 잔액 (이월 포함)">
        <input
          className={inputCls + " text-right tabular"}
          inputMode="numeric"
          value={balance ? Number(bal).toLocaleString("ko-KR") : ""}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0"
        />
      </Field>
      <p className="mb-3 text-[11px] text-stone">
        충전은 자산이 옮겨간 것이라 거래로 기록하지 않습니다. 이 지역화폐로 결제한
        내역이 지출로 잡힙니다.
      </p>
      <div className="mt-2">
        <PrimaryButton onClick={submit} disabled={!valid}>
          저장
        </PrimaryButton>
      </div>
      {initial &&
        (linked > 0 ? (
          <p className="mt-3 text-center text-[11px] text-stone">
            이 지역화폐로 결제한 내역 {linked}건이 있어 삭제할 수 없습니다.
          </p>
        ) : (
          <button
            onClick={async () => {
              if (!window.confirm(`${initial.name}을(를) 삭제할까요?`)) return;
              await removeLocalCurrency(initial.id);
              onClose();
            }}
            className="mt-3 w-full py-2 text-sm text-coral"
          >
            삭제
          </button>
        ))}
    </Sheet>
  );
}

// 충전 / 사용 금액 입력 시트
export function AmountSheet({
  open,
  onClose,
  title,
  label,
  defaultAmount = 0,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  defaultAmount?: number;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const amt = Number(amount.replace(/[^0-9]/g, ""));

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <Field label={label}>
        <input
          className={inputCls + " text-right text-lg font-bold tabular"}
          inputMode="numeric"
          autoFocus
          value={amount ? Number(amt).toLocaleString("ko-KR") : ""}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </Field>
      <div className="mt-2">
        <PrimaryButton
          onClick={() => {
            if (amt > 0) {
              onConfirm(amt);
              setAmount("");
              onClose();
            }
          }}
          disabled={amt <= 0}
        >
          확인
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ───────── 무지출 보상 규칙 ───────── */
export function RewardRuleForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: RewardRule;
}) {
  const { saveRewardRule, removeRewardRule } = useData();
  const [days, setDays] = useState(initial ? String(initial.days) : "5");
  const [name, setName] = useState(initial?.name ?? "");

  const d = Number(days.replace(/[^0-9]/g, ""));
  const valid = d > 0 && name.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await saveRewardRule({ id: initial?.id ?? "", days: d, name: name.trim() });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "보상 규칙 수정" : "보상 규칙 추가"}>
      <Field label="무지출 며칠 달성 시 (이번 달 누적)">
        <input
          className={inputCls + " text-right tabular"}
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="5"
        />
      </Field>
      <Field label="보상">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 배달 1회권, 영화 관람"
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
            await removeRewardRule(initial.id);
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
