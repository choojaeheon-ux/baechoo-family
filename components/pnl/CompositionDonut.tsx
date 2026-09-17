"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { PnlSummary } from "@/lib/types";
import { wonShort } from "@/lib/format";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CompositionDonut({ s }: { s: PnlSummary }) {
  const profit = Math.max(0, s.operatingProfit);
  return (
    <Doughnut
      data={{
        labels: ["고정비", "선저축", "변동비", "운영이익"],
        datasets: [{
          data: [s.fixed, s.saving, s.variable, profit],
          backgroundColor: ["#ff3b30", "#34c759", "#ff9500", "#007aff"],
          borderWidth: 0,
        }],
      }}
      options={{
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label} ${wonShort(Number(ctx.raw))}` } },
        },
      }}
    />
  );
}
