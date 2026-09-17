"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import DailyTodoApp from "@/components/dailytodo/DailyTodoApp";
import Todo52App from "@/components/todo52/Todo52App";
import CompanyCalendar from "@/components/calendar/CompanyCalendar";
import { LargeTitleHeader, Segmented, syncLabel } from "@/components/ios";

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
      <LargeTitleHeader title="투두" subtitle={syncLabel(mode)}>
        <Segmented
          label="투두 보기"
          value={sub}
          onChange={setSub}
          options={(Object.keys(SUB_LABEL) as Sub[]).map((k) => ({ id: k, label: SUB_LABEL[k] }))}
        />
      </LargeTitleHeader>

      {sub === "daily" && (
        <div className="px-4 pt-1 pb-4">
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
        <div className="px-4 pt-1 pb-4">
          <CompanyCalendar />
        </div>
      )}
    </div>
  );
}
