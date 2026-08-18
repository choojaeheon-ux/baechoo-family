"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import Todo52App from "@/components/todo52/Todo52App";
import CompanyCalendar from "@/components/calendar/CompanyCalendar";

type Sub = "todo52" | "company";
const SUB_LABEL: Record<Sub, string> = {
  todo52: "52주 투두",
  company: "추추 회사",
};

export default function TodoPage() {
  const { mode } = useData();
  const [sub, setSub] = useState<Sub>("todo52");

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
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                sub === k ? "bg-leaf text-white" : "text-stone"
              }`}
            >
              {SUB_LABEL[k]}
            </button>
          ))}
        </div>
      </header>

      {sub === "todo52" && <Todo52App embedded />}
      {sub === "company" && (
        <div className="px-4 pt-2 pb-4">
          <CompanyCalendar />
        </div>
      )}
    </div>
  );
}
