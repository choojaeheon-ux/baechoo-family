"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import RecordTab from "./record/RecordTab";
import PatternTab from "./pattern/PatternTab";
import HealthTab from "./HealthTab";
import { GlassIconButton, IconTrash, LargeTitleHeader, Segmented, syncLabel } from "@/components/ios";
import TrashSheet from "./TrashSheet";

// 건강 = 할 일·예방접종·신체검사·건강 기록(옛 신체검사 탭을 합침, 2026-10-06)
type Tab = "record" | "pattern" | "health";

const TABS: { id: Tab; label: string }[] = [
  { id: "record", label: "기록" },
  { id: "pattern", label: "패턴" },
  { id: "health", label: "건강" },
];

export default function BaechooApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("record");
  const [trashOpen, setTrashOpen] = useState(false);

  return (
    <div>
      <LargeTitleHeader
        title="배추 생활기록부"
        subtitle={syncLabel(mode)}
        trailing={
          <GlassIconButton label="휴지통" onClick={() => setTrashOpen(true)}>
            <IconTrash />
          </GlassIconButton>
        }
      >
        <Segmented label="배추 기록 보기" value={tab} onChange={setTab} options={TABS} />
      </LargeTitleHeader>

      <div className="px-4 pt-1 pb-4">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : tab === "record" ? (
          <RecordTab />
        ) : tab === "pattern" ? (
          <PatternTab />
        ) : (
          <HealthTab />
        )}
      </div>

      <TrashSheet open={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}
