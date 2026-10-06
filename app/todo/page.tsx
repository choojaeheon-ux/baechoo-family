"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import DailyTodoApp from "@/components/dailytodo/DailyTodoApp";
import Todo52App from "@/components/todo52/Todo52App";
import CompanyCalendar from "@/components/calendar/CompanyCalendar";
import { Sheet } from "@/components/budget/ui";
import { Toggle } from "@/components/budget/forms";
import {
  LargeTitleHeader,
  Segmented,
  GlassIconButton,
  IconSliders,
  syncLabel,
} from "@/components/ios";
import {
  type TodoTab,
  TODO_TAB_LABEL,
  DEFAULT_TODO_TAB,
  visibleTodoTabs,
  resolveTodoTab,
  readDailyTodoEnabled,
  writeDailyTodoEnabled,
} from "@/lib/todoTabs";

export default function TodoPage() {
  const { loading, mode } = useData();
  const [sub, setSub] = useState<TodoTab>(DEFAULT_TODO_TAB);
  // PinGate가 클라이언트에서만 자식을 렌더하므로 첫 렌더에 기기 설정을 바로 읽어도 된다
  const [dailyOn, setDailyOn] = useState(() => readDailyTodoEnabled());
  const [settingsOpen, setSettingsOpen] = useState(false);

  function setDailyEnabled(on: boolean) {
    writeDailyTodoEnabled(on);
    setDailyOn(on);
    setSub((s) => resolveTodoTab(s, on));
  }

  return (
    <div>
      <LargeTitleHeader
        title="투두"
        subtitle={syncLabel(mode)}
        trailing={
          <GlassIconButton label="투두 설정" onClick={() => setSettingsOpen(true)}>
            <IconSliders />
          </GlassIconButton>
        }
      >
        <Segmented
          label="투두 보기"
          value={sub}
          onChange={setSub}
          options={visibleTodoTabs(dailyOn).map((k) => ({ id: k, label: TODO_TAB_LABEL[k] }))}
        />
      </LargeTitleHeader>

      {sub === "todo52" && <Todo52App embedded />}
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
      {sub === "company" && (
        <div className="px-4 pt-1 pb-4">
          <CompanyCalendar />
        </div>
      )}

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="투두 설정">
        <div className="mb-4">
          <p className="mb-1.5 px-1 text-[13px] font-medium text-stone">데일리 투두</p>
          <Toggle
            options={[
              { v: "on", label: "사용" },
              { v: "off", label: "사용 안 함" },
            ]}
            value={dailyOn ? "on" : "off"}
            onChange={(v) => setDailyEnabled(v === "on")}
          />
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-stone">
            이 폰에만 적용돼요. 꺼도 항목과 체크 기록은 그대로 남아 있어요.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
