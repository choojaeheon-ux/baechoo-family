"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computePnl, buildWaterfall } from "@/lib/pnl";
import { won, currentYearMonth } from "@/lib/format";
import { Card, MonthSwitcher } from "@/components/budget/ui";
import WaterfallChart from "./WaterfallChart";
import BepGauge from "./BepGauge";
import CompositionDonut from "./CompositionDonut";
import AssetReconcile from "./AssetReconcile";
import YearView from "./YearView";

export default function Dashboard() {
  const { transactions, categoryById } = useData();
  const [month, setMonth] = useState(currentYearMonth());
  const [view, setView] = useState<"month" | "year">("month");

  const summary = useMemo(() => {
    const txns = transactions.filter((t) => t.date.startsWith(month));
    return computePnl(txns, categoryById);
  }, [transactions, categoryById, month]);

  const segments = useMemo(() => buildWaterfall(summary), [summary]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(["month", "year"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-lg py-1.5 text-sm ${
              view === v ? "bg-leaf text-white" : "bg-card text-stone"
            }`}
          >
            {v === "month" ? "월" : "연"}
          </button>
        ))}
      </div>

      {view === "month" && (
        <>
          <MonthSwitcher ym={month} onChange={setMonth} />

          <Card>
            <WaterfallChart segments={segments} />
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card><BepGauge margin={summary.operatingMargin} achieved={summary.bepAchieved} /></Card>
            <Card><CompositionDonut s={summary} /></Card>
          </div>

          <Card>
            <table className="w-full text-sm">
              <tbody>
                <tr><td>매출</td><td className="text-right">{won(summary.revenue)}</td></tr>
                <tr><td>− 고정비</td><td className="text-right">{won(summary.fixed)}</td></tr>
                <tr><td>− 선저축</td><td className="text-right">{won(summary.saving)}</td></tr>
                <tr className="border-t"><td>= 가처분이익</td><td className="text-right">{won(summary.grossProfit)}</td></tr>
                <tr><td>− 변동비</td><td className="text-right">{won(summary.variable)}</td></tr>
                <tr className="border-t font-bold"><td>운영이익</td><td className="text-right">{won(summary.operatingProfit)}</td></tr>
              </tbody>
            </table>
          </Card>

          <AssetReconcile month={month} operatingProfit={summary.operatingProfit} />
        </>
      )}

      {view === "year" && <YearView year={Number(month.split("-")[0])} />}
    </div>
  );
}
