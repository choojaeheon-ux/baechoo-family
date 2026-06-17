"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { totalBudget } from "@/lib/compute";
import { installmentStatus } from "@/lib/recurring";
import { won, ymLabel } from "@/lib/format";
import { Card, SectionTitle, Empty, Pill, ProgressBar } from "./ui";
import { BudgetForm, RecurringForm, GoalForm } from "./forms";
import type { Goal, RecurringExpense } from "@/lib/types";

export default function Plans({ ym }: { ym: string }) {
  const { budgets, recurring, goals, categoryById, removeBudget } = useData();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [editRec, setEditRec] = useState<RecurringExpense | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  const monthBudgets = budgets.filter((b) => b.yearMonth === ym);
  const overall = monthBudgets.find((b) => b.categoryId === null);
  const catBudgets = monthBudgets.filter((b) => b.categoryId !== null);

  return (
    <div className="space-y-1 pb-4">
      {/* 예산 */}
      <SectionTitle
        right={
          <button
            onClick={() => setBudgetOpen(true)}
            className="text-xs font-semibold text-leaf"
          >
            + 설정
          </button>
        }
      >
        {ymLabel(ym)} 예산
      </SectionTitle>
      <Card className="space-y-2">
        <Row
          label="전체 월예산"
          value={overall ? won(overall.amount) : "미설정"}
          onDelete={overall ? () => removeBudget(overall.id) : undefined}
          muted={!overall}
        />
        {catBudgets.map((b) => {
          const cat = categoryById(b.categoryId!);
          return (
            <Row
              key={b.id}
              label={`${cat?.icon ?? ""} ${cat?.name ?? "카테고리"}`}
              value={won(b.amount)}
              onDelete={() => removeBudget(b.id)}
            />
          );
        })}
        <div className="border-t border-line pt-2 text-right text-xs text-stone">
          합계 기준 예산 {won(totalBudget(budgets, ym))}
        </div>
      </Card>

      {/* 고정지출 */}
      <SectionTitle
        right={
          <button
            onClick={() => {
              setEditRec(null);
              setRecOpen(true);
            }}
            className="text-xs font-semibold text-leaf"
          >
            + 추가
          </button>
        }
      >
        고정지출 · 할부
      </SectionTitle>
      <Card className="space-y-1">
        {recurring.length === 0 ? (
          <Empty>
            적금·카드값·청약·할부 등
            <br />
            매달 빠져나가는 돈을 등록해 보세요.
          </Empty>
        ) : (
          recurring.map((r) => {
            const cat = categoryById(r.categoryId);
            const inst = installmentStatus(r);
            return (
              <button
                key={r.id}
                onClick={() => {
                  setEditRec(r);
                  setRecOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-cream"
              >
                <span className="text-xl">{cat?.icon ?? "💸"}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {r.name}
                    {r.isInstallment && <Pill tone="leaf">할부</Pill>}
                  </p>
                  <p className="text-xs text-stone">
                    매달 {r.dayOfMonth}일
                    {inst && ` · ${inst.paid}/${inst.total} (${inst.remainingMonths}개월 남음)`}
                  </p>
                </div>
                <span className="text-sm font-bold tabular text-ink">{won(r.amount)}</span>
              </button>
            );
          })
        )}
      </Card>

      {/* 목표 */}
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
        목표 · 계획
      </SectionTitle>
      <Card className="space-y-3">
        {goals.length === 0 ? (
          <Empty>
            출산준비금·비상금 같은
            <br />
            저축 목표를 세워 보세요.
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
                <ProgressBar value={g.currentAmount} max={g.targetAmount} color="var(--color-gold)" />
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

      <BudgetForm open={budgetOpen} onClose={() => setBudgetOpen(false)} ym={ym} />
      <RecurringForm
        open={recOpen}
        onClose={() => setRecOpen(false)}
        initial={editRec ?? undefined}
      />
      <GoalForm
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        initial={editGoal ?? undefined}
      />
    </div>
  );
}

function Row({
  label,
  value,
  onDelete,
  muted,
}: {
  label: string;
  value: string;
  onDelete?: () => void;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${muted ? "text-stone" : "text-ink"}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold tabular ${muted ? "text-stone" : "text-ink"}`}>
          {value}
        </span>
        {onDelete && (
          <button onClick={onDelete} className="text-xs text-coral">
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
