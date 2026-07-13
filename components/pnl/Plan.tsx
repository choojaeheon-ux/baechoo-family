"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computePlanPnl } from "@/lib/plan";
import { buildWaterfall } from "@/lib/pnl";
import { currentYearMonth } from "@/lib/format";
import { Card, SectionTitle } from "@/components/budget/ui";
import WaterfallChart from "./WaterfallChart";
import PlanSummary from "./PlanSummary";

export default function Plan() {
  const { planItems } = useData();
  const [month] = useState(currentYearMonth());

  const summary = useMemo(
    () => computePlanPnl(planItems, month),
    [planItems, month]
  );
  const segments = useMemo(() => buildWaterfall(summary), [summary]);

  return (
    <div className="space-y-4">
      <PlanSummary items={planItems} />

      <SectionTitle>계획 손익</SectionTitle>
      <Card>
        <WaterfallChart segments={segments} />
      </Card>
    </div>
  );
}
