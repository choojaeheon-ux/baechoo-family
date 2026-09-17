"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import UjuDashboard from "./UjuDashboard";
import UjuChecklistTab from "./UjuChecklistTab";
import { GlassIconButton, IconTrash, LargeTitleHeader, Segmented, syncLabel } from "@/components/ios";
import TrashSheet from "@/components/baechoo/TrashSheet";

type Tab = "dashboard" | "checklist";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "checklist", label: "체크리스트" },
];

export default function UjuApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [trashOpen, setTrashOpen] = useState(false);

  return (
    <div>
      <LargeTitleHeader
        title="우주 육아기록부"
        subtitle={syncLabel(mode)}
        trailing={
          <GlassIconButton label="휴지통" onClick={() => setTrashOpen(true)}>
            <IconTrash />
          </GlassIconButton>
        }
      >
        <Segmented label="우주 기록 보기" value={tab} onChange={setTab} options={TABS} />
      </LargeTitleHeader>

      <div className="px-4 pt-1 pb-4">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : tab === "dashboard" ? (
          <UjuDashboard />
        ) : (
          <UjuChecklistTab />
        )}
      </div>

      <TrashSheet open={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}
