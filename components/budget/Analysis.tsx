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
  habitSummary,
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
  const { transactions, budgets, categories, recurring } = useData();

  const monthTxns = monthTransactions(transactions, ym);
  const expense = sumBy(monthTxns, "expense");
  const byCat = spendByCategory(monthTxns);

  const catRows = [...byCat.entries()]
    .map(([id, amt]) => ({ cat: categories.find((c) => c.id === id), amt }))
    .filter((r) => r.cat)
    .sort((a, b) => b.amt - a.amt);

  const trend = monthlyExpenseTrend(transactions, ym, 6);
  const habits = habitSummary(transactions, ym);
  const subs = recurring.filter((r) => r.kind === "subscription");
  const subTotal = subs.reduce((s, r) => s + r.amount, 0);

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

      {/* 줄일 수 있는 항목 (습관 횟수) */}
      <SectionTitle>줄일 수 있는 항목</SectionTitle>
      <Card className="space-y-2">
        {habits.length === 0 && subs.length === 0 ? (
          <Empty>
            내역 입력 시 &lsquo;배달·커피·구독&rsquo; 습관 태그를 달면
            <br />
            이번 달 횟수와 금액이 여기 모여요.
          </Empty>
        ) : (
          <>
            {habits.map((h) => (
              <div key={h.tag} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-light text-sm font-bold text-coral">
                  {h.count}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{h.tag}</p>
                  <p className="text-xs text-stone">이번 달 {h.count}회</p>
                </div>
                <span className="text-sm font-bold tabular text-coral">
                  {won(h.total)}
                </span>
              </div>
            ))}
            {subs.length > 0 && (
              <div className="flex items-center gap-3 border-t border-line pt-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-light text-sm font-bold text-coral">
                  {subs.length}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">구독 서비스</p>
                  <p className="text-xs text-stone">{subs.length}개 구독 중</p>
                </div>
                <span className="text-sm font-bold tabular text-coral">
                  {won(subTotal)}/월
                </span>
              </div>
            )}
          </>
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
