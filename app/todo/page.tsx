"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import DailyTodoApp from "@/components/dailytodo/DailyTodoApp";
import Todo52App from "@/components/todo52/Todo52App";
import CompanyCalendar from "@/components/calendar/CompanyCalendar";

type Sub = "daily" | "todo52" | "company";
const SUB_LABEL: Record<Sub, string> = {
  daily: "데일리 투두",
  todo52: "52주 투두",
  company: "추추 회사",
};

export default function TodoPage() {
  const { loading, mode } = useData();
  const [sub, setSub] = useState<Sub>("daily");

  return (
    <div>
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-4 pb-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-ink">투두</h1>
            <p className="mt-0.5 text-[11px] text-stone">
              {mode === "cloud" ? "클라우드 동기화 중" : "이 기기에 저장 중"}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-card p-1">
          {(Object.keys(SUB_LABEL) as Sub[]).map((k) => (
            <button
              key={k}
              onClick={() => setSub(k)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition ${
                sub === k ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              {SUB_LABEL[k]}
            </button>
          ))}
        </div>
      </header>

      {sub === "daily" && (
        <div className="px-4 pt-2 pb-4">
          {loading ? (
            <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>
          ) : (
            // 로딩 중엔 아예 마운트하지 않는다 — ManageSheet가 초기값(목표 80%)을
            // 캡처해두었다가 blur에 그대로 저장하면 사용자가 정한 목표가 덮어써진다.
            <DailyTodoApp />
          )}
        </div>
      )}
      {sub === "todo52" && <Todo52App embedded />}
      {sub === "company" && (
        <div className="px-4 pt-2 pb-4">
          <CompanyCalendar />
        </div>
      )}
    </div>
  );
}
