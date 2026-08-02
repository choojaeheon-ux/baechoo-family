"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  categoryBudgetTotal,
  monthTransactions,
  resolveVersion,
  spendByCategory,
} from "@/lib/compute";
import { currentYearMonth, won, ymLabel } from "@/lib/format";
import { Card, SectionTitle, Empty, ProgressBar, Pill } from "./ui";
import { BudgetForm, BudgetVersionForm } from "./forms";
import { COST_TYPE_LABEL, type Budget, type BudgetVersion } from "@/lib/types";

// 호출부에서 key={ym}으로 리마운트한다 — 달이 바뀌면 고른 버전도 그 달 기준으로 되돌아간다.
// (effect로 setState하면 set-state-in-effect 룰에 걸린다)
export default function BudgetVersions({ ym }: { ym: string }) {
  const {
    budgets,
    budgetVersions,
    categories,
    categoryById,
    transactions,
    removeBudget,
  } = useData();

  const applied = resolveVersion(budgetVersions, ym);
  const [selectedId, setSelectedId] = useState<string | null>(applied?.id ?? null);
  const [versionForm, setVersionForm] = useState<
    { initial?: BudgetVersion; duplicateFrom?: BudgetVersion } | null
  >(null);
  const [budgetForm, setBudgetForm] = useState<{ initial?: Budget } | null>(null);

  const selected = budgetVersions.find((v) => v.id === selectedId) ?? applied;
  const sorted = [...budgetVersions].sort((a, b) =>
    b.startMonth.localeCompare(a.startMonth)
  );
  const spend = spendByCategory(monthTransactions(transactions, ym));

  // 이번 달 적용 버전이 아니면서 이미 시작한 버전 = 과거. 고치면 지난 달 숫자가 바뀐다.
  const isPast =
    !!selected && selected.id !== applied?.id && selected.startMonth <= currentYearMonth();
  const isApplied = !!selected && selected.id === applied?.id;

  const rows = selected
    ? budgets
        .filter((b) => b.versionId === selected.id && b.categoryId !== null)
        .sort((a, b) => {
          const ca = categoryById(a.categoryId!);
          const cb = categoryById(b.categoryId!);
          return (
            (ca?.groupName ?? "").localeCompare(cb?.groupName ?? "") ||
            (ca?.name ?? "").localeCompare(cb?.name ?? "")
          );
        })
    : [];
  const legacyOverall = selected
    ? budgets.find((b) => b.versionId === selected.id && b.categoryId === null)
    : undefined;
  const total = rows.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-1 pb-4">
      <SectionTitle
        right={
          <button
            onClick={() => setVersionForm({})}
            className="text-xs font-semibold text-leaf"
          >
            + 버전
          </button>
        }
      >
        예산 버전
      </SectionTitle>
      <Card className="space-y-1">
        {sorted.length === 0 ? (
          <Empty>예산 버전을 만들어 보세요.</Empty>
        ) : (
          sorted.map((v) => (
            <div key={v.id} className="flex items-center gap-2">
              <button
                onClick={() => setSelectedId(v.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left ${
                  v.id === selected?.id ? "bg-cream" : ""
                }`}
              >
                <span className="truncate text-sm font-semibold text-ink">{v.name}</span>
                <span className="shrink-0 text-xs text-stone">
                  {ymLabel(v.startMonth)}부터
                </span>
                {v.id === applied?.id && <Pill tone="leaf">이번 달 적용중</Pill>}
              </button>
              <button
                onClick={() => setVersionForm({ duplicateFrom: v })}
                className="shrink-0 text-xs text-leaf"
              >
                복제
              </button>
              <button
                onClick={() => setVersionForm({ initial: v })}
                className="shrink-0 text-xs text-stone"
              >
                수정
              </button>
            </div>
          ))
        )}
      </Card>

      {selected && (
        <>
          <SectionTitle
            right={
              <button
                onClick={() => setBudgetForm({})}
                className="text-xs font-semibold text-leaf"
              >
                + 설정
              </button>
            }
          >
            {selected.name} · 과목별 예산
          </SectionTitle>

          {isPast && (
            <Card className="space-y-2 border border-coral/40">
              <p className="text-xs text-coral">
                지난 달 리포트 숫자가 바뀝니다.
              </p>
              <button
                onClick={() => setVersionForm({ duplicateFrom: selected })}
                className="text-xs font-semibold text-leaf"
              >
                이 버전 복제해서 수정 →
              </button>
            </Card>
          )}

          <Card className="space-y-3">
            {legacyOverall && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone">
                  전체 월예산 (구버전)
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm text-ink">
                    {won(legacyOverall.amount)}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm("전체 월예산(구버전) 행을 삭제할까요?"))
                        removeBudget(legacyOverall.id);
                    }}
                    className="text-xs text-coral"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
            {rows.length === 0 ? (
              <Empty>이 버전에는 아직 예산이 없어요.</Empty>
            ) : (
              rows.map((bud) => {
                const cat = categoryById(bud.categoryId!);
                const used = spend.get(bud.categoryId!) ?? 0;
                return (
                  <div key={bud.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-ink">
                        <span className="truncate">
                          {cat?.groupName && (
                            <span className="text-stone">{cat.groupName} · </span>
                          )}
                          {cat?.name}
                        </span>
                        {cat?.costType && (
                          <Pill tone={cat.costType === "fixed" ? "sky" : "stone"}>
                            {COST_TYPE_LABEL[cat.costType]}
                          </Pill>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-stone">
                          {isApplied ? `${won(used)} / ` : ""}
                          {won(bud.amount)}
                        </span>
                        <button
                          onClick={() => setBudgetForm({ initial: bud })}
                          className="text-xs text-leaf"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `${cat?.name ?? "이"} 예산을 ${selected.name}에서 삭제할까요?`
                              )
                            )
                              removeBudget(bud.id);
                          }}
                          className="text-xs text-coral"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    {/* 사용액은 이번 달 기준이라 적용중 버전에서만 의미가 있다 */}
                    {isApplied && <ProgressBar value={used} max={bud.amount} />}
                  </div>
                );
              })
            )}
            <div className="border-t border-line pt-2 text-right text-xs text-stone">
              합계 {won(total)}
              {isApplied && (
                <>
                  {" · "}
                  {ymLabel(ym)} 적용{" "}
                  {won(categoryBudgetTotal(budgets, budgetVersions, categories, ym))}
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {versionForm && (
        <BudgetVersionForm
          open
          onClose={() => setVersionForm(null)}
          initial={versionForm.initial}
          duplicateFrom={versionForm.duplicateFrom}
        />
      )}
      {budgetForm && selected && (
        <BudgetForm
          open
          onClose={() => setBudgetForm(null)}
          versionId={selected.id}
          initial={budgetForm.initial}
        />
      )}
    </div>
  );
}
