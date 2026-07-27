"use client";

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
import { wonShort } from "@/lib/format";
import type { YearMonthPnl } from "@/lib/pnl";
import { Card } from "@/components/budget/ui";

// ⚠️ generic <Chart type="bar">는 <Bar>/<Doughnut>과 달리 컨트롤러를 자동 등록하지 않는다.
// BarController·LineController를 빼면 콜드 로드에서 "line is not a registered controller"로 죽는다.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

export default function YearChart({ months }: { months: YearMonthPnl[] }) {
  const data: ChartData<"bar" | "line", number[], string> = {
    labels: months.map((m) => `${Number(m.ym.slice(5))}월`),
    datasets: [
      {
        type: "bar" as const,
        label: "운영이익",
        data: months.map((m) => m.summary.operatingProfit),
        backgroundColor: "#5c93a8",
        yAxisID: "y",
        borderRadius: 4,
      },
      {
        type: "line" as const,
        label: "운영이익률",
        data: months.map((m) => m.summary.operatingMargin * 100),
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
      y: { ticks: { callback: (v) => wonShort(Number(v)) } },
      y1: {
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => `${v}%` },
      },
    },
  };

  return (
    <Card>
      <Chart type="bar" data={data} options={options} />
    </Card>
  );
}
