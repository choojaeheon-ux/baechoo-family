"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { useData } from "@/lib/data-context";
import {
  monthTransactions,
  spendByCategory,
  sumBy,
  costTypeSplit,
  monthlyExpenseTrend,
  budgetForCategory,
} from "@/lib/compute";
import { won, wonShort, ymLabel } from "@/lib/format";
import { chartColor } from "@/lib/types";
import { Card, SectionTitle, Empty, ProgressBar } from "./ui";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
);

export default function Analysis({ ym }: { ym: string }) {
  const { transactions, budgets, categories, recurring } = useData();

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const byCat = spendByCategory(monthTxns);

  const catRows = [...byCat.entries()]
    .map(([id, amt]) => ({ cat: categories.find((c) => c.id === id), amt }))
    .filter((r) => r.cat)
    .sort((a, b) => b.amt - a.amt);

  const trend = monthlyExpenseTrend(transactions, ym, 6);
  const split = costTypeSplit(transactions, categories, ym);
  const subs = recurring.filter((r) => r.kind === "subscription");
  const subTotal = subs.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-1 pb-4">
      {/* 계정 과목 비중 */}
      <SectionTitle>계정과목별 지출</SectionTitle>
      <Card>
        {catRows.length === 0 ? (
          <Empty>이번 달 지출 내역이 없어요.</Empty>
        ) : (
          <>
            <div className="mx-auto h-52 w-52">
              <Doughnut
                data={{
                  labels: catRows.map((r) =>
                    r.cat!.groupName ? `${r.cat!.groupName} · ${r.cat!.name}` : r.cat!.name
                  ),
                  datasets: [
                    {
                      data: catRows.map((r) => r.amt),
                      backgroundColor: catRows.map((_, i) => chartColor(i)),
                      borderWidth: 2,
                      borderColor: "#fff",
                    },
                  ],
                }}
                options={{
                  cutout: "62%",
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (c) => ` ${c.label}: ${won(c.parsed)}`,
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-3 space-y-2">
              {catRows.map((r, i) => (
                <div key={r.cat!.id} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: chartColor(i) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {r.cat!.groupName && (
                      <span className="text-stone">{r.cat!.groupName} · </span>
                    )}
                    {r.cat!.name}
                  </span>
                  <span className="text-xs text-stone">
                    {Math.round((r.amt / expense) * 100)}%
                  </span>
                  <span className="w-20 text-right text-sm font-semibold tabular text-ink">
                    {won(r.amt)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* 월별 추이 */}
      <SectionTitle>최근 6개월 지출 추이</SectionTitle>
      <Card>
        <div className="h-44">
          <Line
            data={{
              labels: trend.map((t) => `${Number(t.ym.slice(5))}월`),
              datasets: [
                {
                  data: trend.map((t) => t.expense),
                  borderColor: "#5b8c3e",
                  backgroundColor: "rgba(91,140,62,0.12)",
                  fill: true,
                  tension: 0.35,
                  pointBackgroundColor: "#5b8c3e",
                  pointRadius: 3,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${won(c.parsed.y ?? 0)}` } },
              },
              scales: {
                y: {
                  ticks: { callback: (v) => wonShort(Number(v)) },
                  grid: { color: "#ece7da" },
                },
                x: { grid: { display: false } },
              },
            }}
          />
        </div>
      </Card>

      {/* 고정비 · 변동비 구성 */}
      <SectionTitle>고정비 · 변동비 구성</SectionTitle>
      <Card className="space-y-2">
        {expense === 0 ? (
          <Empty>이번 달 지출 내역이 없어요.</Empty>
        ) : (
          <>
            <CostRow label="고정비" value={split.fixed} total={expense} tone="text-sky" />
            <CostRow
              label="변동비"
              value={split.variable}
              total={expense}
              tone="text-leaf-dark"
            />
            {split.unset > 0 && (
              <CostRow
                label="성격 미지정"
                value={split.unset}
                total={expense}
                tone="text-coral"
              />
            )}
            {subs.length > 0 && (
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
                <span className="text-stone">구독 서비스 {subs.length}개</span>
                <span className="font-bold tabular text-ink">{won(subTotal)}/월</span>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 예산 대비 계정과목 사용률 */}
      <SectionTitle>{ymLabel(ym)} 예산 대비</SectionTitle>
      <Card className="space-y-3">
        {(() => {
          const rows = categories
            .filter((c) => c.type === "expense")
            .map((c) => ({
              c,
              spend: byCat.get(c.id) ?? 0,
              budget: budgetForCategory(budgets, ym, c.id),
            }))
            .filter((r) => r.budget !== null);
          if (rows.length === 0)
            return (
              <Empty>
                카테고리 예산을 설정하면
                <br />
                항목별 사용률을 볼 수 있어요.
              </Empty>
            );
          return rows.map((r) => (
            <div key={r.c.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink">
                  {r.c.name}
                </span>
                <span className="text-xs text-stone">
                  {won(r.spend)} / {won(r.budget!)}
                </span>
              </div>
              <ProgressBar value={r.spend} max={r.budget!} />
            </div>
          ));
        })()}
      </Card>
    </div>
  );
}

function CostRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={`font-semibold ${tone}`}>{label}</span>
        <span className="text-ink">
          <span className="text-xs text-stone">{Math.round(pct)}% · </span>
          <span className="font-bold tabular">{won(value)}</span>
        </span>
      </div>
      <ProgressBar value={value} max={total} />
    </div>
  );
}
