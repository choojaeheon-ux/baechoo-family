"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computePlanPnl } from "@/lib/plan";
import { buildWaterfall } from "@/lib/pnl";
import { currentYearMonth } from "@/lib/format";
import { Card, SectionTitle } from "@/components/budget/ui";
import WaterfallChart from "./WaterfallChart";
import PlanSummary from "./PlanSummary";
import PlanItemList from "./PlanItemList";
import PlanItemForm from "./PlanItemForm";
import type { PlanGroup, PlanItem } from "@/lib/types";

export default function Plan() {
  const { planItems } = useData();
  const [month] = useState(currentYearMonth());

  // 시트 상태 — editing이 있으면 수정, 없으면 draft로 신규
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [draftGroup, setDraftGroup] = useState<PlanGroup>("spending");
  const [draftConditional, setDraftConditional] = useState(false);

  const summary = useMemo(
    () => computePlanPnl(planItems, month),
    [planItems, month]
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
      <PlanSummary items={planItems} />

      <SectionTitle>계획 손익</SectionTitle>
      <Card>
        <WaterfallChart segments={segments} />
      </Card>

      <PlanItemList
        items={planItems}
        month={month}
        onEdit={openEdit}
        onAdd={openAdd}
      />

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
