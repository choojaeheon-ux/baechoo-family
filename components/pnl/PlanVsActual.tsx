"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { computePnl } from "@/lib/pnl";
import { computePlanPnl } from "@/lib/plan";
import { won } from "@/lib/format";
import { Card } from "@/components/budget/ui";
import type { PnlSummary } from "@/lib/types";

type Key = "revenue" | "fixed" | "saving" | "variable" | "operatingProfit";

const ROWS: { key: Key; label: string }[] = [
  { key: "revenue", label: "매출" },
  { key: "fixed", label: "고정비" },
  { key: "saving", label: "선저축" },
  { key: "variable", label: "변동비" },
  { key: "operatingProfit", label: "운영이익" },
];

// 차이의 색: 매출·운영이익은 많을수록 좋고(+가 초록), 비용은 적을수록 좋다(+가 코랄).
function diffTone(key: Key, diff: number): string {
  if (diff === 0) return "text-stone";
  const goodWhenHigher = key === "revenue" || key === "operatingProfit";
  const good = goodWhenHigher ? diff > 0 : diff < 0;
  return good ? "text-leaf-dark" : "text-coral";
}

export default function PlanVsActual({ month }: { month: string }) {
  const { planItems, transactions, categoryById } = useData();

  const plan: PnlSummary = useMemo(
    () => computePlanPnl(planItems, month),
    [planItems, month]
  );
  const actual: PnlSummary = useMemo(
    () =>
      computePnl(
        transactions.filter((t) => t.date.startsWith(month)),
        categoryById
      ),
    [transactions, categoryById, month]
  );

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-stone">
            <th className="pb-1 text-left font-semibold">구분</th>
            <th className="pb-1 text-right font-semibold">계획</th>
            <th className="pb-1 text-right font-semibold">실적</th>
            <th className="pb-1 text-right font-semibold">차이</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => {
            const p = plan[key];
            const a = actual[key];
            const diff = a - p;
            const last = key === "operatingProfit";
            return (
              <tr
                key={key}
                className={last ? "border-t border-line font-bold" : ""}
              >
                <td className={`py-1 text-ink ${last ? "pt-2" : ""}`}>
                  {label}
                </td>
                <td
                  className={`py-1 text-right tabular-nums text-stone ${
                    last ? "pt-2" : ""
                  }`}
                >
                  {won(p)}
                </td>
                <td
                  className={`py-1 text-right tabular-nums text-ink ${
                    last ? "pt-2" : ""
                  }`}
                >
                  {won(a)}
                </td>
                <td
                  className={`py-1 text-right tabular-nums ${diffTone(
                    key,
                    diff
                  )} ${last ? "pt-2" : ""}`}
                >
                  {diff > 0 ? "+" : ""}
                  {won(diff)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] leading-relaxed text-stone">
        실적은 가계부 거래에서 자동 집계된다. 고정비는 캘린더 탭의 고정지출
        체크리스트를 체크해야 거래가 생겨 잡힌다.
      </p>
    </Card>
  );
}
