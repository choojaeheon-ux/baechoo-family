"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { currentYearMonth } from "@/lib/format";
import { MonthSwitcher } from "@/components/budget/ui";
import Analysis from "@/components/budget/Analysis";
import Plans from "@/components/budget/Plans";
import Dashboard from "@/components/pnl/Dashboard";
import YearPnl from "@/components/pnl/YearPnl";
import Manual from "@/components/pnl/Manual";
import { takePendingPnlSub, type PnlSub } from "@/components/pnl/pnlNav";

// 이 순서가 곧 탭 순서다 (Object.keys 순서로 렌더한다)
const SUB_LABEL: Record<PnlSub, string> = {
  dashboard: "대시보드",
  analysis: "분석",
  year: "연간",
  budget: "예산·목표",
  manual: "설명서",
};

export default function PnlPage() {
  const { mode } = useData();
  // 다른 탭에서 「예산·목표」 등을 지정해 넘어왔으면 그 탭으로 연다
  const [sub, setSub] = useState<PnlSub>(() => takePendingPnlSub() ?? "dashboard");
  // 분석·예산 탭은 월 기준 화면 — 손익 대시보드·계획은 자체 월 스위처를 쓴다
  const [ym, setYm] = useState(currentYearMonth());

  const monthly = sub === "analysis" || sub === "budget";

  return (
    <div>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-ink">
              가족 손익
            </h1>
            <p className="mt-0.5 text-[11px] text-stone">
              {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-card p-1">
          {(Object.keys(SUB_LABEL) as PnlSub[]).map((k) => (
            <button
              key={k}
              onClick={() => setSub(k)}
              className={`flex-1 whitespace-nowrap rounded-lg px-1 py-2 text-[12px] font-medium transition ${
                sub === k ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              {SUB_LABEL[k]}
            </button>
          ))}
        </div>
        {monthly && (
          <div className="mt-3">
            <MonthSwitcher ym={ym} onChange={setYm} />
          </div>
        )}
      </header>

      <div className="px-4 pt-4">
        {sub === "dashboard" && <Dashboard />}
        {sub === "year" && <YearPnl />}
        {sub === "analysis" && <Analysis ym={ym} />}
        {sub === "budget" && <Plans ym={ym} />}
        {sub === "manual" && <Manual />}
      </div>
    </div>
  );
}
