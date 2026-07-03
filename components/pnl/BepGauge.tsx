"use client";

import { Chart as ChartJS, ArcElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement);

export default function BepGauge({ margin, achieved }: { margin: number; achieved: boolean }) {
  const pct = Math.max(0, Math.min(1, margin));
  return (
    <div className="relative">
      <Doughnut
        data={{
          datasets: [{
            data: [pct, 1 - pct],
            backgroundColor: [achieved ? "#5b8c3e" : "#c96f6f", "#e8e5df"],
            circumference: 180,
            rotation: 270,
            borderWidth: 0,
          }],
        }}
        options={{ plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: "70%" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <span className="text-lg font-bold">{(margin * 100).toFixed(1)}%</span>
        <span className={`text-xs ${achieved ? "text-leaf" : "text-clay"}`}>
          {achieved ? "BEP ✓ 달성" : "BEP 미달"}
        </span>
      </div>
    </div>
  );
}
