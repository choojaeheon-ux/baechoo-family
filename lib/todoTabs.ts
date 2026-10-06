// 투두 탭 서브탭 구성 + 데일리 투두 사용 설정
// 사용 여부는 기기별(가족 공용 아님)이라 DB가 아닌 localStorage에 둔다. 값이 없으면 꺼짐.
// 끄는 건 탭을 숨길 뿐 — 데일리 투두 항목·체크 기록은 그대로 남는다.

export type TodoTab = "todo52" | "daily" | "company";

export const TODO_TAB_LABEL: Record<TodoTab, string> = {
  todo52: "52주 투두",
  daily: "데일리 투두",
  company: "추추 회사",
};

export const DEFAULT_TODO_TAB: TodoTab = "todo52";

export function visibleTodoTabs(dailyEnabled: boolean): TodoTab[] {
  return dailyEnabled ? ["todo52", "daily", "company"] : ["todo52", "company"];
}

// 보던 탭이 숨겨지면 52주 투두로
export function resolveTodoTab(tab: TodoTab, dailyEnabled: boolean): TodoTab {
  return visibleTodoTabs(dailyEnabled).includes(tab) ? tab : DEFAULT_TODO_TAB;
}

export const DAILY_TODO_PREF_KEY = "baechoo-daily-todo-enabled";

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };

function browserStore(): KV | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readDailyTodoEnabled(store?: KV | null): boolean {
  try {
    const s = store === undefined ? browserStore() : store;
    return s?.getItem(DAILY_TODO_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDailyTodoEnabled(on: boolean, store?: KV | null): void {
  try {
    const s = store === undefined ? browserStore() : store;
    s?.setItem(DAILY_TODO_PREF_KEY, on ? "1" : "0");
  } catch {
    // 저장소 차단(사생활 보호 모드 등) — 이번 화면에만 반영된다
  }
}
