"use client";

import { useRouter } from "next/navigation";
import { useData } from "@/lib/data-context";
import {
  monthTransactions,
  sumBy,
  budgetBurndown,
  groupBurnRows,
  monthTimeProgress,
  type BurnRow,
} from "@/lib/compute";
import { won, ymLabel } from "@/lib/format";
import { Card, BurnBar, SectionTitle, Empty } from "./ui";
import NoSpendChallenge from "./NoSpendChallenge";
import { setPendingPnlSub } from "@/components/pnl/pnlNav";

// 예산을 안 잡은 과목은 %를 낼 수 없다 — 쓴 게 있으면 "초과"(막대 가득), 없으면 "—"
function pctLabel(r: BurnRow): string {
  if (r.budget > 0) return `${r.pct.toFixed(1)}%`;
  return r.spend > 0 ? "" : "—";
}

export default function Dashboard({
  ym,
  onGotoCategory,
}: {
  ym: string;
  onGotoCategory: (categoryId: string) => void;
}) {
  const { transactions, budgets, budgetVersions, categories } = useData();
  const router = useRouter();

  // 예산 설정은 손익 메뉴의 「예산·목표」로 옮겼다
  const gotoBudget = () => {
    setPendingPnlSub("budget");
    router.push("/pnl");
  };

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const income = sumBy(monthTxns, "income");
  const balance = income - expense;

  const burn = budgetBurndown(budgets, budgetVersions, categories, transactions, ym);
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
            <BurnBar pct={burn.pct} />
            <p className="mt-2 text-[11px] text-stone">
              {timePct === null
                ? `${ymLabel(ym)} · 계정과목별 예산의 총합 대비 지출`
                : `기간 진행 ${timePct.toFixed(1)}% 대비 소진 ${burn.pct.toFixed(1)}%`}
            </p>
          </>
        ) : (
          <button onClick={gotoBudget} className="w-full py-3 text-sm text-stone">
            아직 계정과목별 예산이 없어요.{" "}
            <span className="font-semibold text-leaf">설정하기 →</span>
          </button>
        )}
      </Card>

      {/* 계정과목별 예산 소진률 */}
      <SectionTitle
        right={
          <button onClick={gotoBudget} className="text-xs font-semibold text-leaf">
            예산 관리 →
          </button>
        }
      >
        계정과목별 예산 소진률
      </SectionTitle>
      <Card className="space-y-4">
        {burn.rows.length === 0 ? (
          <Empty>
            손익 → 예산·목표 탭에서 계정 과목별
            <br />
            기본 예산을 설정해 보세요.
          </Empty>
        ) : (
          groups.map((g) => (
            <div key={g.name}>
              {/* 카테고리 머리글 — 카테고리에는 예산을 책정하지 않으므로 이름만 */}
              <p className="mb-1.5 rounded-md bg-stone px-2 py-1 text-[11px] font-bold text-white">
                {g.name}
              </p>
              <div className="space-y-2 border-l-2 border-line pl-2">
                {g.rows.map((r) => {
                  const over = r.pct > 100;
                  return (
                    <button
                      key={r.category.id}
                      onClick={() => onGotoCategory(r.category.id)}
                      aria-label={`${r.category.name} 거래내역 보기`}
                      className="-mx-1 block w-full rounded-md px-1 py-0.5 text-left transition active:bg-cream"
                    >
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                          {r.category.name}
                        </span>
                        <span
                          className={`shrink-0 text-[13px] font-bold tabular ${
                            over ? "text-coral" : "text-ink"
                          }`}
                        >
                          {pctLabel(r)}
                          {over && <span className="ml-1 text-[11px]">초과</span>}
                          <span className="ml-1 text-[11px] font-normal text-stone">
                            ({won(r.spend)} / {won(r.budget)})
                          </span>
                        </span>
                      </div>
                      <BurnBar pct={r.pct} height="h-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <p className="border-t border-line pt-2 text-[11px] text-stone">
          계정 과목을 누르면 거래내역에서 그 과목만 봅니다.
        </p>
      </Card>

      {/* 무지출 챌린지 — 캘린더에서 대시보드 맨 아래로 옮겼다 */}
      <NoSpendChallenge ym={ym} />

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
