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
  reducibleItems,
  monthlyExpenseTrend,
  budgetForCategory,
} from "@/lib/compute";
import { won, wonShort, ymLabel } from "@/lib/format";
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
  const { transactions, budgets, categories } = useData();

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const byCat = spendByCategory(monthTxns);

  const catRows = [...byCat.entries()]
    .map(([id, amt]) => ({ cat: categories.find((c) => c.id === id), amt }))
    .filter((r) => r.cat)
    .sort((a, b) => b.amt - a.amt);

  const trend = monthlyExpenseTrend(transactions, ym, 6);
  const reducible = reducibleItems(transactions, budgets, categories, ym);

  return (
    <div className="space-y-1 pb-4">
      {/* 카테고리 비중 */}
      <SectionTitle>카테고리별 지출</SectionTitle>
      <Card>
        {catRows.length === 0 ? (
          <Empty>이번 달 지출 내역이 없어요.</Empty>
        ) : (
          <>
            <div className="mx-auto h-52 w-52">
              <Doughnut
                data={{
                  labels: catRows.map((r) => r.cat!.name),
                  datasets: [
                    {
                      data: catRows.map((r) => r.amt),
                      backgroundColor: catRows.map((r) => r.cat!.color),
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
              {catRows.map((r) => (
                <div key={r.cat!.id} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: r.cat!.color }}
                  />
                  <span className="flex-1 text-sm text-ink">
                    {r.cat!.icon} {r.cat!.name}
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

      {/* 줄일 수 있는 항목 */}
      <SectionTitle>줄일 수 있는 항목</SectionTitle>
      <Card className="space-y-3">
        {reducible.length === 0 ? (
          <Empty>예산 초과·급증한 항목이 없어요. 잘 관리하고 있어요 👍</Empty>
        ) : (
          reducible.map((it) => (
            <div key={it.category.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-lg">{it.category.icon}</span>
                <span className="flex-1 text-sm font-semibold text-ink">
                  {it.category.name}
                </span>
                <span className="text-sm font-bold tabular text-coral">
                  {won(it.spend)}
                </span>
              </div>
              {it.budget !== null && (
                <ProgressBar value={it.spend} max={it.budget} />
              )}
              <p className="mt-1 text-xs text-coral">⚠️ {it.reason}</p>
            </div>
          ))
        )}
      </Card>

      {/* 예산 대비 카테고리 사용률 */}
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
                  {r.c.icon} {r.c.name}
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
