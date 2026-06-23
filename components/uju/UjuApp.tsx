"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import UjuDashboard from "./UjuDashboard";
import UjuChecklistTab from "./UjuChecklistTab";
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
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">🍼</span>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-ink">
              우주 육아기록부
            </h1>
            <p className="mt-0.5 text-[11px] text-stone">
              {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTrashOpen(true)}
            aria-label="휴지통"
            className="ml-auto rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-semibold text-stone active:scale-95"
          >
            휴지통
          </button>
        </div>

        {/* 서브탭 토글 */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                tab === t.id
                  ? "bg-leaf text-white"
                  : "bg-card text-stone border border-line"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-3 pb-4">
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
