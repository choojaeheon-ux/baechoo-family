"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, SectionTitle, Empty, ProgressBar, Accordion } from "./ui";
import { GoalForm, CategoryForm, PaymentMethodForm } from "./forms";
import {
  COST_TYPE_LABEL,
  PAYMENT_KIND_LABEL,
  TX_TYPE_COLOR,
  UNGROUPED,
  type Category,
  type Goal,
  type PaymentMethod,
} from "@/lib/types";
import { won } from "@/lib/format";

const PAYMENT_KIND_ICON: Record<PaymentMethod["kind"], string> = {
  card: "💳",
  cash: "💵",
  account: "🏦",
};

export default function Plans() {
  const { goals, categories, paymentMethods } = useData();
  const [goalOpen, setGoalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [pmOpen, setPmOpen] = useState(false);
  const [editPm, setEditPm] = useState<PaymentMethod | null>(null);

  return (
    <div className="space-y-1 pb-4">
      {/* 연간 목표 */}
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditGoal(null);
              setGoalOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 추가
          </button>
        }
      >
        연간 목표
      </SectionTitle>
      <Card className="space-y-3">
        {goals.length === 0 ? (
          <Empty>
            비상금 500만원, 여행자금 200만원 같은
            <br />
            연간 저축 목표를 세워 보세요.
          </Empty>
        ) : (
          goals.map((g) => {
            const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
            return (
              <button
                key={g.id}
                onClick={() => {
                  setEditGoal(g);
                  setGoalOpen(true);
                }}
                className="block w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">🎯 {g.name}</span>
                  <span className="text-sm font-bold tabular text-leaf-dark">
                    {Math.round(pct)}%
                  </span>
                </div>
                <ProgressBar
                  value={g.currentAmount}
                  max={g.targetAmount}
                  color="var(--color-gold)"
                />
                <p className="mt-1 flex justify-between text-xs text-stone">
                  <span>
                    {won(g.currentAmount)} / {won(g.targetAmount)}
                  </span>
                  {g.deadline && <span>~{g.deadline}</span>}
                </p>
              </button>
            );
          })
        )}
      </Card>

      {/* 계정 과목 관리 — 지출/수입을 나눠서 보여준다 */}
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditCat(null);
              setCatOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 추가
          </button>
        }
      >
        계정 과목 관리
      </SectionTitle>
      <Card className="space-y-5">
        {(["expense", "income"] as const).map((t) => {
          const rows = categories.filter((c) => c.type === t);
          // 카테고리(상위 분류)로 묶는다. 미분류는 맨 뒤.
          const byGroup = new Map<string, typeof rows>();
          for (const c of rows) {
            const key = c.groupName || UNGROUPED;
            byGroup.set(key, [...(byGroup.get(key) ?? []), c]);
          }
          const groups = [...byGroup.entries()].sort(([a], [b]) =>
            a === UNGROUPED ? 1 : b === UNGROUPED ? -1 : a.localeCompare(b)
          );
          return (
            <div key={t}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-stone">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: TX_TYPE_COLOR[t] }}
                />
                {t === "expense" ? "지출 계정 과목" : "수입 계정 과목"} ({rows.length})
              </p>
              {rows.length === 0 ? (
                <p className="py-2 text-xs text-stone">아직 없어요.</p>
              ) : (
                // 카테고리 줄만 접힌 채로 보여주고, 누르면 그 안의 과목이 펼쳐진다
                <div className="rounded-xl border border-line px-3">
                  {groups.map(([gName, gRows]) => (
                    <Accordion key={gName} label={gName} count={gRows.length}>
                      <div className="flex flex-wrap gap-2">
                        {gRows.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setEditCat(c);
                              setCatOpen(true);
                            }}
                            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-ink active:bg-cream"
                            style={{ borderColor: TX_TYPE_COLOR[t] }}
                          >
                            {c.name}
                            {t === "expense" && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  c.costType === "fixed"
                                    ? "text-sky"
                                    : c.costType === "variable"
                                      ? "text-stone"
                                      : "text-coral"
                                }`}
                              >
                                {c.costType ? COST_TYPE_LABEL[c.costType] : "성격 미지정"}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </Accordion>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* 결제수단 관리 — 고정지출 탭에서 옮겨 왔다. 종류별로 접어 둔다 */}
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditPm(null);
              setPmOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 추가
          </button>
        }
      >
        결제수단 관리
      </SectionTitle>
      <Card>
        {paymentMethods.length === 0 ? (
          <Empty>카드·현금·계좌를 등록해 보세요.</Empty>
        ) : (
          <div className="rounded-xl border border-line px-3">
            {(["card", "cash", "account"] as PaymentMethod["kind"][]).map((k) => {
              const rows = paymentMethods.filter((p) => p.kind === k);
              if (rows.length === 0) return null;
              return (
                <Accordion
                  key={k}
                  label={`${PAYMENT_KIND_ICON[k]} ${PAYMENT_KIND_LABEL[k]}`}
                  count={rows.length}
                >
                  <div className="flex flex-wrap gap-2">
                    {rows.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setEditPm(p);
                          setPmOpen(true);
                        }}
                        className="rounded-full border border-line px-3 py-1.5 text-sm text-ink active:bg-cream"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </Accordion>
              );
            })}
          </div>
        )}
      </Card>

      {goalOpen && (
        <GoalForm
          open={goalOpen}
          onClose={() => setGoalOpen(false)}
          initial={editGoal ?? undefined}
        />
      )}
      {catOpen && (
        <CategoryForm
          open={catOpen}
          onClose={() => setCatOpen(false)}
          initial={editCat ?? undefined}
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
