"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import MealList from "./MealList";
import HealthList from "./HealthList";
import ExamList from "./ExamList";

type Tab = "meal" | "health" | "exam";

const TABS: { id: Tab; label: string }[] = [
  { id: "meal", label: "식사" },
  { id: "health", label: "건강" },
  { id: "exam", label: "신체검사" },
];

export default function BaechooApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("meal");

  return (
    <div>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">🐶</span>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-ink">
              배추 생활기록부
            </h1>
            <p className="mt-0.5 text-[11px] text-stone">
              {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
            </p>
          </div>
        </div>

        {/* 서브탭 토글 */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
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
        ) : tab === "meal" ? (
          <MealList />
        ) : tab === "health" ? (
          <HealthList />
        ) : (
          <ExamList />
        )}
      </div>
    </div>
  );
}
