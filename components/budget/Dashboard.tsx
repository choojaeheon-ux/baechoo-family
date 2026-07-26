"use client";

import { useData } from "@/lib/data-context";
import {
  monthTransactions,
  sumBy,
  budgetBurndown,
  groupBurnRows,
  monthTimeProgress,
} from "@/lib/compute";
import { won, ymLabel } from "@/lib/format";
import { Card, BurnBar, SectionTitle, Empty } from "./ui";
import type { Tab } from "./BudgetApp";

export default function Dashboard({
  ym,
  onGoto,
}: {
  ym: string;
  onGoto: (t: Tab) => void;
}) {
  const { transactions, budgets, categories } = useData();

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const income = sumBy(monthTxns, "income");
  const balance = income - expense;

  const burn = budgetBurndown(budgets, categories, transactions, ym);
  const groups = groupBurnRows(burn.rows);
  const timePct = monthTimeProgress(ym);

  return (
    <div className="space-y-1 pb-4">
      {/* 이번 달 수입·지출 */}
      <SectionTitle>이번 달 수입·지출</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <SummaryBox label="수입" value={won(income)} tone="text-sky" />
        <SummaryBox label="지출" value={won(expense)} tone="text-coral" />
        <SummaryBox
          label="잔액"
          value={won(balance)}
          tone={balance >= 0 ? "text-leaf-dark" : "text-coral"}
        />
      </div>

      {/* 전체 예산 소진률 */}
      <SectionTitle>예산 소진률</SectionTitle>
      <Card>
        {burn.budget > 0 ? (
          <>
            <div className="mb-2 flex items-end justify-between">
              <span
                className={`text-3xl font-extrabold tabular ${
                  burn.pct > 100 ? "text-coral" : "text-leaf-dark"
                }`}
              >
                {burn.pct.toFixed(1)}%
              </span>
              <span className="text-xs text-stone">
                {won(burn.spend)} / {won(burn.budget)}
              </span>
            </div>
            <BurnBar pct={burn.pct} marker={timePct} />
            <p className="mt-2 text-[11px] text-stone">
              {timePct === null
                ? `${ymLabel(ym)} · 계정과목별 예산의 총합 대비 지출`
                : `기간 진행 ${timePct.toFixed(1)}% (점선) 대비 소진 ${burn.pct.toFixed(1)}%`}
            </p>
          </>
        ) : (
          <button
            onClick={() => onGoto("plans")}
            className="w-full py-3 text-sm text-stone"
          >
            아직 계정과목별 예산이 없어요.{" "}
            <span className="font-semibold text-leaf">설정하기 →</span>
          </button>
        )}
      </Card>

      {/* 계정과목별 예산 소진률 */}
      <SectionTitle
        right={
          <button
            onClick={() => onGoto("plans")}
            className="text-xs font-semibold text-leaf"
          >
            예산 관리 →
          </button>
        }
      >
        계정과목별 예산 소진률
      </SectionTitle>
      <Card className="space-y-4">
        {burn.rows.length === 0 ? (
          <Empty>
            예산·목표 탭에서 계정 과목별
            <br />
            기본 예산을 설정해 보세요.
          </Empty>
        ) : (
          groups.map((g) => (
            <div key={g.name}>
              {/* 카테고리 머리글 — 카테고리에는 예산을 책정하지 않으므로 이름만 */}
              <p className="mb-2 rounded-lg bg-cream px-2 py-1 text-[11px] font-bold text-stone">
                {g.name}
              </p>
              <div className="space-y-3 pl-2">
                {g.rows.map((r) => (
                  <div key={r.category.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {r.category.name}
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold tabular ${
                          r.pct > 100 ? "text-coral" : "text-ink"
                        }`}
                      >
                        {r.pct.toFixed(1)}%
                        {r.pct > 100 && <span className="ml-1 text-[11px]">초과</span>}
                      </span>
                    </div>
                    <BurnBar pct={r.pct} marker={timePct} height="h-2.5" />
                    <p className="mt-1 text-right text-[11px] text-stone tabular">
                      {won(r.spend)} / {won(r.budget)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {burn.unbudgeted.length > 0 && (
          <div className="border-t border-line pt-3">
            <p className="mb-2 text-[11px] font-semibold text-stone">
              예산 미설정 · 지출만 발생
            </p>
            <div className="space-y-1">
              {burn.unbudgeted.map((u) => (
                <div
                  key={u.category.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {u.category.groupName && (
                      <span className="text-stone">{u.category.groupName} · </span>
                    )}
                    {u.category.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular text-stone">
                    {won(u.spend)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="h-2" />
      <p className="px-1 text-center text-[11px] text-stone">
        오늘도 배추가족 화이팅 🥬
      </p>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-2.5 text-center">
      <p className="text-[11px] text-stone">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular ${tone}`}>{value}</p>
    </div>
  );
}
