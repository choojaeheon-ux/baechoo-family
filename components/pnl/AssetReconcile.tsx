"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { won } from "@/lib/format";
import { Card } from "@/components/budget/ui";
import { newId } from "@/lib/repo";

function prevYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AssetReconcile({ month, operatingProfit }: { month: string; operatingProfit: number }) {
  const { assetSnapshots, saveAssetSnapshot } = useData();
  const cur = assetSnapshots.find((a) => a.yearMonth === month);
  const prev = assetSnapshots.find((a) => a.yearMonth === prevYm(month));
  const [draft, setDraft] = useState(cur ? String(cur.totalAssets) : "");

  const save = () => {
    const val = Number(draft.replace(/[^0-9]/g, ""));
    if (!val) return;
    saveAssetSnapshot({ id: cur?.id ?? newId(), yearMonth: month, totalAssets: val });
  };

  const increase = cur && prev ? cur.totalAssets - prev.totalAssets : null;
  const diff = increase != null ? increase - operatingProfit : null;

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold">자산 대조</div>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="월말 총자산"
          className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
        />
        <button onClick={save} className="rounded-lg bg-leaf px-3 py-2 text-sm text-white">저장</button>
      </div>
      {increase != null ? (
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span>전월 대비 자산증가</span><span>{won(increase)}</span></div>
          <div className="flex justify-between"><span>운영이익(잉여)</span><span>{won(operatingProfit)}</span></div>
          <div className="flex justify-between font-medium"><span>차이(점검)</span><span>{won(diff!)}</span></div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-stone">전월 자산이 없으면 대조를 생략합니다</p>
      )}
    </Card>
  );
}
