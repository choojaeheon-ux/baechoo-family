"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { installmentStatus } from "@/lib/recurring";
import { won } from "@/lib/format";
import {
  PAYMENT_KIND_LABEL,
  type PaymentMethod,
  type RecurringExpense,
  type RecurringKind,
} from "@/lib/types";
import { Card, SectionTitle, Empty, Pill } from "./ui";
import {
  RecurringForm,
  PaymentMethodForm,
} from "./forms";

export default function FixedExpenses() {
  const {
    recurring,
    paymentMethods,
    categoryById,
    paymentMethodById,
  } = useData();
  const [recOpen, setRecOpen] = useState(false);
  const [editRec, setEditRec] = useState<RecurringExpense | null>(null);
  const [recKind, setRecKind] = useState<RecurringKind>("fixed");
  const [pmOpen, setPmOpen] = useState(false);
  const [editPm, setEditPm] = useState<PaymentMethod | null>(null);
  const byKind = (k: RecurringKind) => recurring.filter((r) => r.kind === k);

  function openAdd(kind: RecurringKind) {
    setEditRec(null);
    setRecKind(kind);
    setRecOpen(true);
  }
  function openEdit(r: RecurringExpense) {
    setEditRec(r);
    setRecKind(r.kind);
    setRecOpen(true);
  }

  const monthlyTotal = (k: RecurringKind) =>
    byKind(k).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-1 pb-4">
      {/* 고정지출 */}
      <SectionTitle right={<AddBtn onClick={() => openAdd("fixed")} />}>
        고정지출 ({won(monthlyTotal("fixed"))}/월)
      </SectionTitle>
      <Card className="space-y-1">
        {byKind("fixed").length === 0 ? (
          <Empty>통신비·관리비·적금 등 매달 같은 지출을 등록하세요.</Empty>
        ) : (
          byKind("fixed").map((r) => {
            const cat = categoryById(r.categoryId);
            const pm = r.paymentMethodId ? paymentMethodById(r.paymentMethodId) : null;
            return (
              <ItemRow
                key={r.id}
                icon={cat?.icon ?? "💸"}
                title={r.name}
                sub={`매달 ${r.dayOfMonth}일${pm ? ` · ${pm.name}` : ""}`}
                amount={won(r.amount)}
                onClick={() => openEdit(r)}
              />
            );
          })
        )}
      </Card>

      {/* 구독 서비스 */}
      <SectionTitle right={<AddBtn onClick={() => openAdd("subscription")} />}>
        구독 서비스 ({won(monthlyTotal("subscription"))}/월)
      </SectionTitle>
      <Card className="space-y-1">
        {byKind("subscription").length === 0 ? (
          <Empty>넷플릭스·유튜브 등 구독 서비스를 등록하세요.</Empty>
        ) : (
          byKind("subscription").map((r) => {
            const pm = r.paymentMethodId ? paymentMethodById(r.paymentMethodId) : null;
            return (
              <ItemRow
                key={r.id}
                icon="🔁"
                title={r.name}
                sub={`매달 ${r.dayOfMonth}일${pm ? ` · ${pm.name}` : ""}`}
                amount={won(r.amount)}
                onClick={() => openEdit(r)}
              />
            );
          })
        )}
      </Card>

      {/* 할부 · 대출 */}
      <SectionTitle right={<AddBtn onClick={() => openAdd("installment")} />}>
        할부 · 대출
      </SectionTitle>
      <Card className="space-y-1">
        {byKind("installment").length === 0 ? (
          <Empty>할부·대출의 잔여 개월과 월 납입금을 관리하세요.</Empty>
        ) : (
          byKind("installment").map((r) => {
            const st = installmentStatus(r);
            return (
              <button
                key={r.id}
                onClick={() => openEdit(r)}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-cream"
              >
                <span className="text-xl">🧾</span>
                <div className="flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                    {r.name}
                    {st?.done && <Pill tone="leaf">완료</Pill>}
                  </p>
                  {st && (
                    <p className="text-xs text-stone">
                      {st.paid}/{st.total} · {st.remainingMonths}개월 남음 · 잔액{" "}
                      {won(st.remainingAmount)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold tabular text-ink">
                  {won(r.amount)}/월
                </span>
              </button>
            );
          })
        )}
      </Card>

      {/* 결제수단 관리 */}
      <SectionTitle
        right={
          <AddBtn
            onClick={() => {
              setEditPm(null);
              setPmOpen(true);
            }}
          />
        }
      >
        결제수단 관리
      </SectionTitle>
      <Card>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setEditPm(p);
                setPmOpen(true);
              }}
              className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-ink active:bg-cream"
            >
              {p.kind === "card" ? "💳" : p.kind === "cash" ? "💵" : "🏦"} {p.name}
              <span className="text-[11px] text-stone">
                {PAYMENT_KIND_LABEL[p.kind]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {recOpen && (
        <RecurringForm
          open={recOpen}
          onClose={() => setRecOpen(false)}
          initial={editRec ?? undefined}
          defaultKind={recKind}
        />
      )}
      {pmOpen && (
        <PaymentMethodForm
          open={pmOpen}
          onClose={() => setPmOpen(false)}
          initial={editPm ?? undefined}
        />
      )}
    </div>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-semibold text-leaf">
      + 추가
    </button>
  );
}

function ItemRow({
  icon,
  title,
  sub,
  amount,
  onClick,
}: {
  icon: string;
  title: string;
  sub: string;
  amount: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-cream"
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-stone">{sub}</p>
      </div>
      <span className="text-sm font-bold tabular text-ink">{amount}</span>
    </button>
  );
}
