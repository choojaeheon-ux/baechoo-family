"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { activeItems, computePlanPnl } from "@/lib/plan";
import { buildWaterfall } from "@/lib/pnl";
import { currentYearMonth } from "@/lib/format";
import { Card, SectionTitle, MonthSwitcher } from "@/components/budget/ui";
import WaterfallChart from "./WaterfallChart";
import PlanSummary from "./PlanSummary";
import PlanItemList from "./PlanItemList";
import PlanItemForm from "./PlanItemForm";
import PlanVsActual from "./PlanVsActual";
import BudgetRules from "./BudgetRules";
import type { PlanGroup, PlanItem } from "@/lib/types";

export default function Plan() {
  const { planItems } = useData();
  const [month, setMonth] = useState(currentYearMonth());

  // 시트 상태 — editing이 있으면 수정, 없으면 draft로 신규
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [draftGroup, setDraftGroup] = useState<PlanGroup>("spending");
  const [draftConditional, setDraftConditional] = useState(false);

  // 계획 탭은 언제나 "선택한 달 기준의 계획"을 보여준다 — 종료된 항목은
  // 이 달의 계획에서 제외하고, 히어로·리스트·대조표가 같은 목록을 공유한다.
  const active = useMemo(
    () => activeItems(planItems, month),
    [planItems, month]
  );
  const summary = useMemo(
    () => computePlanPnl(active, month),
    [active, month]
  );
  const segments = useMemo(() => buildWaterfall(summary), [summary]);

  const openEdit = (item: PlanItem) => {
    setEditing(item);
    setSheetOpen(true);
  };
  const openAdd = (group: PlanGroup, conditional: boolean) => {
    setEditing(null);
    setDraftGroup(group);
    setDraftConditional(conditional);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <MonthSwitcher ym={month} onChange={setMonth} />

      <PlanSummary items={active} />

      <SectionTitle>계획 손익</SectionTitle>
      <Card>
        <WaterfallChart segments={segments} />
      </Card>

      <SectionTitle>계획 vs 실적</SectionTitle>
      <PlanVsActual month={month} />

      <PlanItemList
        items={active}
        month={month}
        onEdit={openEdit}
        onAdd={openAdd}
      />

      <div className="pt-2">
        <BudgetRules />
      </div>

      {sheetOpen && (
        <PlanItemForm
          open
          initial={editing}
          draftGroup={draftGroup}
          draftConditional={draftConditional}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
