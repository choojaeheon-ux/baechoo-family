"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import UjuChecklistTab from "./UjuChecklistTab";
import { GlassIconButton, IconTrash, LargeTitleHeader, syncLabel } from "@/components/ios";
import TrashSheet from "@/components/baechoo/TrashSheet";

// 서브탭은 체크리스트 하나뿐이라 세그먼트를 두지 않는다 — 탭이 늘면 그때 붙인다
export default function UjuApp() {
  const { loading, mode } = useData();
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
      />

      <div className="px-4 pt-1 pb-4">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : (
          <UjuChecklistTab />
        )}
      </div>

      <TrashSheet open={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}
