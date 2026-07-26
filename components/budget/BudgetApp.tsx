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
import LocalCurrencies from "./LocalCurrencies";

export type Tab =
  | "home"
  | "calendar"
  | "list"
  | "plans"
  | "analysis"
  | "fixed"
  | "voucher";

const SUBTABS: { id: Tab; label: string }[] = [
  { id: "home", label: "대시보드" },
  { id: "calendar", label: "캘린더" },
  { id: "list", label: "거래내역" },
  { id: "plans", label: "예산·목표" },
  { id: "analysis", label: "분석" },
  { id: "fixed", label: "고정지출" },
  { id: "voucher", label: "지역화폐" },
];

export default function BudgetApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("home");
  const [ym, setYm] = useState(currentYearMonth());
  const [addOpen, setAddOpen] = useState(false);
  // 대시보드에서 계정 과목을 눌러 넘어올 때 거래내역에 걸어줄 필터
  const [listCategoryId, setListCategoryId] = useState<string | null>(null);

  // 탭을 직접 고르면 넘겨받은 필터는 지운다(거래내역을 그냥 열면 전체가 보이도록)
  const goto = (t: Tab) => {
    setListCategoryId(null);
    setTab(t);
  };
  const gotoCategory = (categoryId: string) => {
    setListCategoryId(categoryId);
    setTab("list");
  };

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
              onClick={() => goto(s.id)}
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
            {tab === "home" && (
              <Dashboard ym={ym} onGoto={goto} onGotoCategory={gotoCategory} />
            )}
            {tab === "calendar" && <CalendarView ym={ym} />}
            {tab === "list" && (
              // key로 다시 마운트시켜야 넘겨준 필터가 반영된다.
              // (이미 거래내역에 있을 때는 탭이 안 바뀌어 초기값을 다시 읽지 않는다)
              <Transactions
                key={listCategoryId ?? "all"}
                ym={ym}
                initialCategoryId={listCategoryId}
              />
            )}
            {tab === "plans" && <Plans ym={ym} />}
            {tab === "analysis" && <Analysis ym={ym} />}
            {tab === "fixed" && <FixedExpenses />}
            {tab === "voucher" && <LocalCurrencies ym={ym} />}
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

      {addOpen && (
        <TransactionForm open={addOpen} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
