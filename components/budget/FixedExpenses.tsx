"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { installmentStatus } from "@/lib/recurring";
import { won } from "@/lib/format";
import { type RecurringExpense, type RecurringKind } from "@/lib/types";
import { Card, SectionTitle, Empty, Pill } from "./ui";
import { RecurringForm } from "./forms";
import RecurringChecklist from "./RecurringChecklist";

export default function FixedExpenses({ ym }: { ym: string }) {
  const { recurring, paymentMethodById } = useData();
  const [recOpen, setRecOpen] = useState(false);
  const [editRec, setEditRec] = useState<RecurringExpense | null>(null);
  const [recKind, setRecKind] = useState<RecurringKind>("fixed");
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
      {/* 이번 달 출금 체크리스트 — 체크해야 실제 거래로 잡힌다 */}
      <RecurringChecklist ym={ym} />

      {/* 고정지출 */}
      <SectionTitle right={<AddBtn onClick={() => openAdd("fixed")} />}>
        고정지출 ({won(monthlyTotal("fixed"))}/월)
      </SectionTitle>
      <Card className="space-y-1">
        {byKind("fixed").length === 0 ? (
          <Empty>통신비·관리비·적금 등 매달 같은 지출을 등록하세요.</Empty>
        ) : (
          byKind("fixed").map((r) => {
            const pm = r.paymentMethodId ? paymentMethodById(r.paymentMethodId) : null;
            return (
              <ItemRow
                key={r.id}
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

      {recOpen && (
        <RecurringForm
          open={recOpen}
          onClose={() => setRecOpen(false)}
          initial={editRec ?? undefined}
          defaultKind={recKind}
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
  icon?: string;
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
      {icon ? (
        <span className="text-xl">{icon}</span>
      ) : (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: "var(--color-coral)" }}
        />
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-stone">{sub}</p>
      </div>
      <span className="text-sm font-bold tabular text-ink">{amount}</span>
    </button>
  );
}
