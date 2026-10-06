import { describe, it, expect } from "vitest";
import {
  DAILY_TODO_PREF_KEY,
  readDailyTodoEnabled,
  writeDailyTodoEnabled,
  visibleTodoTabs,
  resolveTodoTab,
  DEFAULT_TODO_TAB,
} from "./todoTabs";

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

const broken = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("데일리 투두 사용 설정(기기별)", () => {
  it("설정한 적 없는 기기에서는 꺼져 있다", () => {
    expect(readDailyTodoEnabled(memoryStore())).toBe(false);
  });

  it("켜면 다시 읽어도 켜져 있고, 끄면 꺼진다", () => {
    const s = memoryStore();
    writeDailyTodoEnabled(true, s);
    expect(readDailyTodoEnabled(s)).toBe(true);
    writeDailyTodoEnabled(false, s);
    expect(readDailyTodoEnabled(s)).toBe(false);
  });

  it("저장소를 쓸 수 없으면 꺼짐으로 보고, 저장 실패로 화면이 죽지 않는다", () => {
    expect(readDailyTodoEnabled(broken)).toBe(false);
    expect(() => writeDailyTodoEnabled(true, broken)).not.toThrow();
  });

  it("저장소가 없으면(서버 렌더) 꺼짐", () => {
    expect(readDailyTodoEnabled(null)).toBe(false);
  });

  it("키는 다른 설정과 겹치지 않는 고유 이름이다", () => {
    expect(DAILY_TODO_PREF_KEY).toBe("baechoo-daily-todo-enabled");
  });
});

describe("투두 서브탭", () => {
  it("처음 열리는 화면은 52주 투두다", () => {
    expect(DEFAULT_TODO_TAB).toBe("todo52");
  });

  it("52주 투두가 맨 앞이다", () => {
    expect(visibleTodoTabs(true)[0]).toBe("todo52");
    expect(visibleTodoTabs(false)[0]).toBe("todo52");
  });

  it("데일리 투두를 끄면 탭에서 사라진다", () => {
    expect(visibleTodoTabs(false)).toEqual(["todo52", "company"]);
  });

  it("데일리 투두를 켜면 52주 투두 다음에 나온다", () => {
    expect(visibleTodoTabs(true)).toEqual(["todo52", "daily", "company"]);
  });

  it("데일리 화면을 보다가 끄면 52주 투두로 넘어간다", () => {
    expect(resolveTodoTab("daily", false)).toBe("todo52");
  });

  it("다른 화면은 켜고 꺼도 그대로다", () => {
    expect(resolveTodoTab("company", false)).toBe("company");
    expect(resolveTodoTab("todo52", true)).toBe("todo52");
    expect(resolveTodoTab("daily", true)).toBe("daily");
  });
});
