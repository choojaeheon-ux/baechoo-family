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
import { LargeTitleHeader, Segmented, syncLabel } from "@/components/ios";

export type PnlSub = "dashboard" | "year" | "analysis" | "budget" | "manual";

// 이 순서가 곧 탭 순서다 (Object.keys 순서로 렌더한다)
const SUB_LABEL: Record<PnlSub, string> = {
  dashboard: "대시보드",
  analysis: "분석",
  year: "연간",
  budget: "목표·관리",
  manual: "설명서",
};

export default function PnlPage() {
  const { mode } = useData();
  const [sub, setSub] = useState<PnlSub>("dashboard");
  // 월 기준 화면은 분석 탭만 남았다 — 목표·관리는 월과 무관하다
  const [ym, setYm] = useState(currentYearMonth());

  const monthly = sub === "analysis";

  return (
    <div>
      <LargeTitleHeader title="가족 손익" subtitle={syncLabel(mode)}>
        <Segmented
          label="손익 보기"
          value={sub}
          onChange={setSub}
          options={(Object.keys(SUB_LABEL) as PnlSub[]).map((k) => ({ id: k, label: SUB_LABEL[k] }))}
        />
        {monthly && <MonthSwitcher ym={ym} onChange={setYm} />}
      </LargeTitleHeader>

      <div className="px-4 pt-1">
        {sub === "dashboard" && <Dashboard />}
        {sub === "year" && <YearPnl />}
        {sub === "analysis" && <Analysis ym={ym} />}
        {sub === "budget" && <Plans />}
        {sub === "manual" && <Manual />}
      </div>
    </div>
  );
}
