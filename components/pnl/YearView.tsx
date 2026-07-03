"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Chart } from "react-chartjs-2";
import { useData } from "@/lib/data-context";
import { computePnl } from "@/lib/pnl";
import { won, wonShort } from "@/lib/format";
import { Card } from "@/components/budget/ui";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

export default function YearView({ year }: { year: number }) {
  const { transactions, categoryById } = useData();

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`),
    [year],
  );

  const summaries = useMemo(
    () => months.map((m) => computePnl(transactions.filter((t) => t.date.startsWith(m)), categoryById)),
    [months, transactions, categoryById],
  );

  const totalRevenue = summaries.reduce((a, s) => a + s.revenue, 0);
  const totalProfit = summaries.reduce((a, s) => a + s.operatingProfit, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  const data: ChartData<"bar" | "line", number[], string> = {
    labels: months.map((_, i) => `${i + 1}월`),
    datasets: [
      {
        type: "bar" as const,
        label: "운영이익",
        data: summaries.map((s) => s.operatingProfit),
        backgroundColor: "#5c93a8",
        yAxisID: "y",
        borderRadius: 4,
      },
      {
        type: "line" as const,
        label: "운영이익률",
        data: summaries.map((s) => s.operatingMargin * 100),
        borderColor: "#e0a15f",
        backgroundColor: "#e0a15f",
        yAxisID: "y1",
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ctx.dataset.type === "line"
              ? `${Number(ctx.raw).toFixed(1)}%`
              : wonShort(Number(ctx.raw)),
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v) => wonShort(Number(v)) },
      },
      y1: {
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => `${v}%` },
      },
    },
  };

  return (
    <div className="space-y-4">
      <Card>
        <Chart type="bar" data={data} options={options} />
      </Card>
      <Card>
        <div className="flex justify-between text-sm">
          <span>연간 매출</span>
          <span>{won(totalRevenue)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span>연간 운영이익</span>
          <span>{won(totalProfit)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>평균 운영이익률</span>
          <span>{(avgMargin * 100).toFixed(1)}%</span>
        </div>
      </Card>
    </div>
  );
}
