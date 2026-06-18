"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { totalBudget, monthTransactions, spendByCategory } from "@/lib/compute";
import { won, ymLabel } from "@/lib/format";
import { Card, SectionTitle, Empty, ProgressBar } from "./ui";
import { BudgetForm, GoalForm, CategoryForm } from "./forms";
import type { Category, Goal } from "@/lib/types";

export default function Plans({ ym }: { ym: string }) {
  const { budgets, goals, categories, transactions, categoryById, removeBudget } =
    useData();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  const monthBudgets = budgets.filter((b) => b.yearMonth === ym);
  const overall = monthBudgets.find((b) => b.categoryId === null);
  const catBudgets = monthBudgets.filter((b) => b.categoryId !== null);
  const spend = spendByCategory(monthTransactions(transactions, ym));

  return (
    <div className="space-y-1 pb-4">
      {/* 월 예산 */}
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
        {ymLabel(ym)} 월 예산
      </SectionTitle>
      <Card className="space-y-3">
        {overall && (
          <Row
            label="전체 월예산"
            value={won(overall.amount)}
            onDelete={() => removeBudget(overall.id)}
          />
        )}
        {catBudgets.length === 0 && !overall ? (
          <Empty>
            카테고리별 예산을 설정해 보세요
            <br />
            (식비·생활용품·육아·병원·취미…)
          </Empty>
        ) : (
          catBudgets.map((b) => {
            const cat = categoryById(b.categoryId!);
            const used = spend.get(b.categoryId!) ?? 0;
            return (
              <div key={b.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    {cat?.icon} {cat?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone">
                      {won(used)} / {won(b.amount)}
                    </span>
                    <button
                      onClick={() => removeBudget(b.id)}
                      className="text-xs text-coral"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <ProgressBar value={used} max={b.amount} />
              </div>
            );
          })
        )}
        <div className="border-t border-line pt-2 text-right text-xs text-stone">
          합계 기준 예산 {won(totalBudget(budgets, ym))}
        </div>
      </Card>

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

      {/* 카테고리 관리 */}
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
        카테고리 관리
      </SectionTitle>
      <Card>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setEditCat(c);
                setCatOpen(true);
              }}
              className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-ink active:bg-cream"
            >
              <span>{c.icon}</span>
              {c.name}
              <span
                className="ml-0.5 h-2 w-2 rounded-full"
                style={{ background: c.color }}
              />
            </button>
          ))}
        </div>
      </Card>

      {budgetOpen && (
        <BudgetForm open={budgetOpen} onClose={() => setBudgetOpen(false)} ym={ym} />
      )}
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
    </div>
  );
}

function Row({
  label,
  value,
  onDelete,
}: {
  label: string;
  value: string;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular text-ink">{value}</span>
        {onDelete && (
          <button onClick={onDelete} className="text-xs text-coral">
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
