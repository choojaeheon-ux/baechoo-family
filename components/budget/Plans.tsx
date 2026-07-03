"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  totalBudget,
  monthTransactions,
  spendByCategory,
  budgetForCategory,
} from "@/lib/compute";
import { won, ymLabel } from "@/lib/format";
import { Card, SectionTitle, Empty, ProgressBar } from "./ui";
import { BudgetForm, GoalForm, CategoryForm } from "./forms";
import type { Budget, Category, Goal } from "@/lib/types";

export default function Plans({ ym }: { ym: string }) {
  const { budgets, goals, categories, transactions, categoryById, removeBudget } =
    useData();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInitial, setBudgetInitial] = useState<Budget | undefined>(undefined);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  const baseBudgets = budgets.filter((b) => b.yearMonth === null);
  const baseOverall = baseBudgets.find((b) => b.categoryId === null);
  const baseCats = baseBudgets.filter((b) => b.categoryId !== null);
  const overrides = budgets.filter((b) => b.yearMonth === ym);
  const spend = spendByCategory(monthTransactions(transactions, ym));

  const openNew = () => {
    setBudgetInitial(undefined);
    setBudgetOpen(true);
  };
  const openEdit = (bud: Budget) => {
    setBudgetInitial(bud);
    setBudgetOpen(true);
  };

  return (
    <div className="space-y-1 pb-4">
      {/* 기본 예산 */}
      <SectionTitle
        right={
          <button onClick={openNew} className="text-xs font-semibold text-leaf">
            + 설정
          </button>
        }
      >
        기본 예산 · 매달 적용
      </SectionTitle>
      <Card className="space-y-3">
        {baseOverall && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">전체 월예산</span>
            <div className="flex items-center gap-2">
              <span className="text-sm tabular text-ink">{won(baseOverall.amount)}</span>
              <button onClick={() => openEdit(baseOverall)} className="text-xs text-leaf">
                수정
              </button>
              <button
                onClick={() => removeBudget(baseOverall.id)}
                className="text-xs text-coral"
              >
                삭제
              </button>
            </div>
          </div>
        )}
        {baseCats.length === 0 && !baseOverall ? (
          <Empty>
            카테고리별 기본 예산을 설정해 보세요
            <br />
            (한 번 설정하면 매달 적용됩니다)
          </Empty>
        ) : (
          baseCats.map((bud) => {
            const cat = categoryById(bud.categoryId!);
            const applied = budgetForCategory(budgets, ym, bud.categoryId!) ?? bud.amount;
            const used = spend.get(bud.categoryId!) ?? 0;
            return (
              <div key={bud.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    {cat?.icon} {cat?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone">
                      {won(used)} / {won(bud.amount)}
                    </span>
                    <button onClick={() => openEdit(bud)} className="text-xs text-leaf">
                      수정
                    </button>
                    <button
                      onClick={() => removeBudget(bud.id)}
                      className="text-xs text-coral"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <ProgressBar value={used} max={applied} />
              </div>
            );
          })
        )}
        <div className="border-t border-line pt-2 text-right text-xs text-stone">
          {ymLabel(ym)} 적용 합계 {won(totalBudget(budgets, ym))}
        </div>
      </Card>

      {/* 이번 달 조정 */}
      {overrides.length > 0 && (
        <>
          <SectionTitle>{ymLabel(ym)} 이번 달 조정</SectionTitle>
          <Card className="space-y-2">
            {overrides.map((ov) => {
              const label =
                ov.categoryId === null
                  ? "전체 월예산"
                  : categoryById(ov.categoryId)?.name ?? "카테고리";
              const icon = ov.categoryId === null ? "" : categoryById(ov.categoryId)?.icon ?? "";
              const base = baseBudgets.find((b) => b.categoryId === ov.categoryId);
              return (
                <div key={ov.id} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    {icon} {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular text-ink">{won(ov.amount)}</span>
                    {base && (
                      <span className="text-xs text-stone">(기본 {won(base.amount)})</span>
                    )}
                    <button onClick={() => openEdit(ov)} className="text-xs text-leaf">
                      수정
                    </button>
                    <button
                      onClick={() => removeBudget(ov.id)}
                      className="text-xs text-coral"
                    >
                      기본으로
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

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
        <BudgetForm
          open={budgetOpen}
          onClose={() => setBudgetOpen(false)}
          ym={ym}
          initial={budgetInitial}
        />
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
