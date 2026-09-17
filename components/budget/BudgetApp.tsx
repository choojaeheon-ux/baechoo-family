"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { currentYearMonth } from "@/lib/format";
import { useDrillBack } from "@/lib/useDrillBack";
import { MonthSwitcher } from "./ui";
import { TransactionForm } from "./forms";
import Dashboard from "./Dashboard";
import Transactions from "./Transactions";
import FixedExpenses from "./FixedExpenses";
import LocalCurrencies from "./LocalCurrencies";
import BudgetVersions from "./BudgetVersions";
import { IconPlus, LargeTitleHeader, Segmented, syncLabel } from "@/components/ios";

export type Tab = "home" | "list" | "voucher" | "fixed" | "budget";

const SUBTABS: { id: Tab; label: string }[] = [
  { id: "home", label: "대시보드" },
  { id: "list", label: "거래내역" },
  { id: "voucher", label: "지역화폐" },
  { id: "fixed", label: "고정지출" },
  { id: "budget", label: "예산" },
];

export default function BudgetApp() {
  const { loading, mode } = useData();
  const [tab, setTab] = useState<Tab>("home");
  const [ym, setYm] = useState(currentYearMonth());
  const [addOpen, setAddOpen] = useState(false);
  // 대시보드에서 계정 과목을 눌러 넘어올 때 거래내역에 걸어줄 필터
  const [listCategoryId, setListCategoryId] = useState<string | null>(null);

  // 드릴다운으로 들어왔으면 뒤로가기가 대시보드로 되돌린다(앱 밖으로 튕기지 않게)
  const armBack = useDrillBack(() => {
    setListCategoryId(null);
    setTab("home");
  });

  // 탭을 직접 고르면 넘겨받은 필터는 지운다(거래내역을 그냥 열면 전체가 보이도록)
  const goto = (t: Tab) => {
    setListCategoryId(null);
    setTab(t);
  };
  const gotoCategory = (categoryId: string) => {
    setListCategoryId(categoryId);
    setTab("list");
    armBack();
  };

  return (
    <div>
      <LargeTitleHeader title="배추가족 가계부" subtitle={syncLabel(mode)}>
        <MonthSwitcher ym={ym} onChange={setYm} />
        <Segmented label="가계부 보기" value={tab} onChange={goto} options={SUBTABS} />
      </LargeTitleHeader>

      <div className="px-4 pt-1">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
        ) : (
          <>
            {tab === "home" && (
              <Dashboard
                ym={ym}
                onGotoCategory={gotoCategory}
                onGotoBudget={() => goto("budget")}
              />
            )}
            {tab === "list" && (
              // key로 다시 마운트시켜야 넘겨준 필터가 반영된다.
              // (이미 거래내역에 있을 때는 탭이 안 바뀌어 초기값을 다시 읽지 않는다)
              <Transactions
                key={listCategoryId ?? "all"}
                ym={ym}
                initialCategoryId={listCategoryId}
              />
            )}
            {tab === "voucher" && <LocalCurrencies ym={ym} />}
            {tab === "fixed" && <FixedExpenses ym={ym} />}
            {tab === "budget" && <BudgetVersions key={ym} ym={ym} />}
          </>
        )}
      </div>

      {/* 빠른 입력 FAB — 하단 탭 위로 띄움 */}
      {(tab === "home" || tab === "list") && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md">
          <button
            onClick={() => setAddOpen(true)}
            className="press pointer-events-auto absolute right-5 flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-white shadow-[0_10px_24px_rgba(36,138,61,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]"
            style={{ bottom: "calc(var(--tabbar-gap) + var(--tabbar-h) + 14px)" }}
            aria-label="내역 추가"
          >
            <IconPlus className="h-7 w-7" />
          </button>
        </div>
      )}

      {addOpen && (
        <TransactionForm open={addOpen} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
