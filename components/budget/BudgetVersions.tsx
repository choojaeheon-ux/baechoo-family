"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  categoryBudgetTotal,
  groupBudgetsByCategory,
  monthTransactions,
  resolveVersion,
  spendByCategory,
} from "@/lib/compute";
import { moveGroup, moveSubject } from "@/lib/budgetOrder";
import { won, ymLabel } from "@/lib/format";
import { Card, SectionTitle, Empty, ProgressBar, Pill } from "./ui";
import { BudgetForm, BudgetVersionForm } from "./forms";
import { COST_TYPE_LABEL, UNGROUPED, type Budget, type BudgetVersion } from "@/lib/types";

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
    saveBudget,
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

  // 더 늦은 시작월의 버전이 이미 있는 버전 = 과거. 고치면 그 구간의 숫자가 바뀐다.
  // (조회 중인 달 ym 기준의 applied와는 무관 — 예산 탭 월 스위처로 과거 달로 이동해도
  // 배너가 꺼지면 안 된다.)
  const isPast =
    !!selected && budgetVersions.some((v) => v.startMonth > selected.startMonth);
  const isApplied = !!selected && selected.id === applied?.id;

  const groups = selected
    ? groupBudgetsByCategory(
        budgets.filter((b) => b.versionId === selected.id && b.categoryId !== null),
        categoryById
      )
    : [];
  const total = groups.reduce(
    (s, g) => s + g.rows.reduce((t, b) => t + b.amount, 0),
    0
  );
  const legacyOverall = selected
    ? budgets.find((b) => b.versionId === selected.id && b.categoryId === null)
    : undefined;
  // 미분류는 groupBudgetsByCategory가 항상 맨 뒤로 강제해 이동이 표시에 반영되지 않는다.
  // 그룹 이동은 미분류 자체와, 미분류 바로 앞(사실상 맨 뒤)까지만 허용한다.
  const lastMovable =
    groups.at(-1)?.name === UNGROUPED ? groups.length - 2 : groups.length - 1;

  const [ordering, setOrdering] = useState(false);
  const [saving, setSaving] = useState(false);

  // 이동 결과를 저장한다. saveBudget은 실패 시 예외를 던지므로(sbUpsertOrThrow)
  // 낙관적으로 먼저 그리지 않고, 바뀐 행만 저장이 끝난 뒤 컨텍스트가 반영하게 둔다.
  async function applyOrder(next: Budget[]) {
    if (saving) return;
    const current = new Map(
      groups.flatMap((g) => g.rows).map((b) => [b.id, b.sortOrder])
    );
    const changed = next.filter((b) => current.get(b.id) !== b.sortOrder);
    if (changed.length === 0) return;
    setSaving(true);
    try {
      for (const b of changed) await saveBudget(b);
    } catch (e) {
      console.error("순서 저장 실패", e);
      window.alert("순서를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

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
                {v.id === applied?.id && <Pill tone="leaf">적용중</Pill>}
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOrdering((v) => !v)}
                  className="text-xs font-semibold text-stone"
                >
                  {ordering ? "편집 완료" : "순서 편집"}
                </button>
                {!ordering && (
                  <button
                    onClick={() => setBudgetForm({})}
                    className="text-xs font-semibold text-leaf"
                  >
                    + 설정
                  </button>
                )}
              </div>
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

          <Card className="space-y-4">
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
            {groups.length === 0 ? (
              <Empty>이 버전에는 아직 예산이 없어요.</Empty>
            ) : (
              groups.map((g, gi) => (
                <div key={g.name}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <p className="flex-1 rounded-md bg-stone px-2 py-1 text-[11px] font-bold text-white">
                      {g.name}
                    </p>
                    {ordering && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          disabled={gi === 0 || g.name === UNGROUPED || saving}
                          onClick={() => applyOrder(moveGroup(groups, gi, -1))}
                          aria-label={`${g.name} 위로`}
                          className="px-2 py-1 text-sm text-leaf disabled:text-stone/40"
                        >
                          ▲
                        </button>
                        <button
                          disabled={gi >= lastMovable || g.name === UNGROUPED || saving}
                          onClick={() => applyOrder(moveGroup(groups, gi, 1))}
                          aria-label={`${g.name} 아래로`}
                          className="px-2 py-1 text-sm text-leaf disabled:text-stone/40"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 border-l-2 border-line pl-2">
                    {g.rows.map((bud, ri) => {
                      const cat = categoryById(bud.categoryId!);
                      const used = spend.get(bud.categoryId!) ?? 0;
                      return (
                        <div key={bud.id}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-ink">
                              <span className="truncate">{cat?.name}</span>
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
                              {ordering ? (
                                <>
                                  <button
                                    disabled={ri === 0 || saving}
                                    onClick={() => applyOrder(moveSubject(groups, g.name, ri, -1))}
                                    aria-label={`${cat?.name ?? "과목"} 위로`}
                                    className="px-1 text-sm text-leaf disabled:text-stone/40"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    disabled={ri === g.rows.length - 1 || saving}
                                    onClick={() => applyOrder(moveSubject(groups, g.name, ri, 1))}
                                    aria-label={`${cat?.name ?? "과목"} 아래로`}
                                    className="px-1 text-sm text-leaf disabled:text-stone/40"
                                  >
                                    ▼
                                  </button>
                                </>
                              ) : (
                                <>
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
                                </>
                              )}
                            </div>
                          </div>
                          {/* 사용액은 이번 달 기준이라 적용중 버전에서만 의미가 있다 */}
                          {isApplied && !ordering && <ProgressBar value={used} max={bud.amount} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
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
          onCreated={(id) => setSelectedId(id)}
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
