"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { currentYearMonth } from "@/lib/format";
import { MonthSwitcher } from "./ui";
import { TransactionForm } from "./forms";
import Dashboard from "./Dashboard";
import CalendarView from "./CalendarView";
import Transactions from "./Transactions";
import Analysis from "./Analysis";
import Plans from "./Plans";
import FixedExpenses from "./FixedExpenses";

export type Tab =
  | "home"
  | "calendar"
  | "list"
  | "plans"
  | "analysis"
  | "fixed";

const SUBTABS: { id: Tab; label: string }[] = [
  { id: "home", label: "대시보드" },
  { id: "calendar", label: "캘린더" },
  { id: "list", label: "거래내역" },
  { id: "plans", label: "예산·목표" },
  { id: "analysis", label: "분석" },
  { id: "fixed", label: "고정지출" },
];

export default function BudgetApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("home");
  const [ym, setYm] = useState(currentYearMonth());
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-2 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥬</span>
            <div>
              <h1 className="text-lg font-extrabold leading-none text-ink">
                배추가족 가계부
              </h1>
              <p className="mt-0.5 text-[11px] text-stone">
                {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
              </p>
            </div>
          </div>
        </div>
        <MonthSwitcher ym={ym} onChange={setYm} />

        {/* 서브탭 */}
        <div className="mt-3 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {SUBTABS.map((s) => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                tab === s.id
                  ? "bg-leaf text-white"
                  : "bg-card text-stone border border-line"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-1">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : (
          <>
            {tab === "home" && <Dashboard ym={ym} onGoto={setTab} />}
            {tab === "calendar" && <CalendarView ym={ym} />}
            {tab === "list" && <Transactions ym={ym} />}
            {tab === "plans" && <Plans ym={ym} />}
            {tab === "analysis" && <Analysis ym={ym} />}
            {tab === "fixed" && <FixedExpenses />}
          </>
        )}
      </div>

      {/* 빠른 입력 FAB — 하단 탭 위로 띄움 */}
      {(tab === "home" || tab === "calendar" || tab === "list") && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md">
          <button
            onClick={() => setAddOpen(true)}
            className="pointer-events-auto absolute right-4 flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-3xl text-white shadow-lg transition active:scale-90"
            style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
            aria-label="내역 추가"
          >
            +
          </button>
        </div>
      )}

      <TransactionForm open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
