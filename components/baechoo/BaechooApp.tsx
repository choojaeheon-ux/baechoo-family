"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import MealList from "./MealList";
import HealthList from "./HealthList";
import ExamList from "./ExamList";
import WalkList from "./WalkList";
import { GlassIconButton, IconTrash, LargeTitleHeader, Segmented, syncLabel } from "@/components/ios";
import TrashSheet from "./TrashSheet";

type Tab = "meal" | "health" | "exam" | "walk";

const TABS: { id: Tab; label: string }[] = [
  { id: "meal", label: "식사" },
  { id: "health", label: "건강" },
  { id: "exam", label: "신체검사" },
  { id: "walk", label: "산책" },
];

export default function BaechooApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("meal");
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
        ) : tab === "meal" ? (
          <MealList />
        ) : tab === "health" ? (
          <HealthList />
        ) : tab === "exam" ? (
          <ExamList />
        ) : (
          <WalkList />
        )}
      </div>

      <TrashSheet open={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}
