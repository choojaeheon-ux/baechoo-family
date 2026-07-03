"use client";

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { WaterfallSegment } from "@/lib/types";
import { wonShort } from "@/lib/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const COLOR: Record<WaterfallSegment["kind"], string> = {
  revenue: "#3f6b2a",
  deduct: "#c96f6f",
  profit: "#5c93a8",
};

export default function WaterfallChart({ segments }: { segments: WaterfallSegment[] }) {
  const data = {
    labels: segments.map((s) => s.label),
    datasets: [{
      data: segments.map((s) => s.range),
      backgroundColor: segments.map((s) => COLOR[s.kind]),
      borderRadius: 4,
    }],
  };
  return (
    <Bar
      data={data}
      options={{
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => wonShort(segments[ctx.dataIndex].value),
            },
          },
        },
        scales: { y: { ticks: { callback: (v) => wonShort(Number(v)) } } },
      }}
    />
  );
}
