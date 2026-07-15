"use client";

import { useEffect, useMemo, useState } from "react";
import { currentYearMonth, daysInMonth, todayISO } from "@/lib/format";
import { addDays } from "@/lib/calendar";
import { FAMILY_PIN } from "@/components/PinGate";
import { Card, MonthSwitcher } from "@/components/budget/ui";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 서버(/api/company-calendar)가 정규화해 주는 회사 일정 + 할 일(Google Tasks)
interface CompanyEvent {
  id: string;
  title: string;
  date: string; // 시작일 YYYY-MM-DD
  endDate: string; // 종료일 (inclusive)
  time: string | null; // null = 종일
  endTime: string | null;
  kind?: "event" | "task"; // task = 할 일 (구버전 응답 호환 위해 optional)
  done?: boolean;
}

// ym별 조회 결과 — 로딩은 "현재 ym의 결과가 아직 없음"으로 파생
// (effect 안 동기 setState는 react-hooks/set-state-in-effect가 막음)
interface FetchResult {
  ym: string;
  events: CompanyEvent[];
  error: boolean;
}

export default function CompanyCalendar() {
  const [ym, setYm] = useState(currentYearMonth());
  const [selected, setSelected] = useState<string | null>(todayISO());
  const [result, setResult] = useState<FetchResult | null>(null);

  const today = todayISO();
  const from = `${ym}-01`;
  const to = `${ym}-${String(daysInMonth(ym)).padStart(2, "0")}`;

  useEffect(() => {
    let alive = true;
    fetch(`/api/company-calendar?ym=${ym}`, {
      headers: { "x-family-pin": FAMILY_PIN },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { events: CompanyEvent[] }) => {
        if (alive) setResult({ ym, events: data.events, error: false });
      })
      .catch(() => {
        if (alive) setResult({ ym, events: [], error: true });
      });
    return () => {
      alive = false;
    };
  }, [ym]);

  const loaded = result?.ym === ym ? result : null;
  const isLoading = !loaded;
  const isError = loaded?.error ?? false;

  // 날짜별 매핑 (연박은 덮는 날짜 전부, 이번 달 범위만)
  const byDate = useMemo(() => {
    const m = new Map<string, CompanyEvent[]>();
    for (const e of loaded?.events ?? []) {
      for (let d = e.date; d <= e.endDate; d = addDays(d, 1)) {
        if (d < from || d > to) continue;
        m.set(d, [...(m.get(d) ?? []), e]);
      }
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => ((a.time ?? "") < (b.time ?? "") ? -1 : 1));
    }
    return m;
  }, [loaded, from, to]);

  // 월 그리드 셀
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth(ym) }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-2">
      <Card>
        <div className="mb-3">
          <MonthSwitcher
            ym={ym}
            onChange={(next) => {
              setYm(next);
              setSelected(null);
            }}
          />
        </div>

        {isError ? (
          <p className="py-8 text-center text-sm text-stone">
            회사 일정을 불러오지 못했어요.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
        ) : (
          <>
            <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-stone">
              {WEEK.map((w, i) => (
                <span
                  key={w}
                  className={i === 0 ? "text-coral" : i === 6 ? "text-sky" : ""}
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, idx) => {
                if (day === null) return <span key={`e${idx}`} />;
                const iso = `${ym}-${String(day).padStart(2, "0")}`;
                return (
                  <button
                    key={day}
                    onClick={() => setSelected((p) => (p === iso ? null : iso))}
                    className="flex flex-col items-center"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        iso === today ? "bg-leaf font-bold text-white" : "text-ink"
                      } ${selected === iso ? "ring-2 ring-leaf ring-offset-1" : ""}`}
                    >
                      {day}
                    </span>
                    <span className="mt-0.5 flex h-1.5 gap-0.5">
                      {(byDate.get(iso) ?? [])
                        .filter((e) => e.kind !== "task" || !e.done)
                        .slice(0, 3)
                        .map((e, i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              e.kind === "task"
                                ? "bg-[var(--color-coral)]"
                                : "bg-[var(--color-sky)]"
                            }`}
                          />
                        ))}
                    </span>
                  </button>
                );
              })}
            </div>
            {isLoading && (
              <p className="mt-2 text-center text-xs text-stone">불러오는 중…</p>
            )}
          </>
        )}
      </Card>

      {selected && loaded && !loaded.error && (
        <Card>
          <p className="mb-2 text-sm font-bold text-ink">
            {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 (
            {WEEK[new Date(selected).getDay()]}) 추추 회사 일정
          </p>
          {(() => {
            const all = byDate.get(selected) ?? [];
            const evs = all.filter((e) => e.kind !== "task");
            const tasks = all.filter((e) => e.kind === "task");
            if (all.length === 0)
              return <p className="py-2 text-center text-xs text-stone">일정이 없어요</p>;
            return (
              <div className="space-y-2">
                {evs.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="h-8 w-1 shrink-0 rounded-full bg-[var(--color-sky)]" />
                    <span className="w-11 shrink-0 text-xs font-semibold text-stone">
                      {e.time ?? "종일"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {e.title}
                    </span>
                  </div>
                ))}
                {tasks.length > 0 && (
                  <div className={evs.length > 0 ? "border-t border-line pt-2" : ""}>
                    <p className="mb-1.5 text-[11px] font-bold text-stone">할 일</p>
                    <div className="space-y-1.5">
                      {tasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${
                              t.done
                                ? "border-leaf bg-leaf text-white"
                                : "border-[var(--color-coral)] text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                              t.done ? "text-stone line-through" : "text-ink"
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      )}

      <p className="px-1 text-center text-[11px] text-stone">
        추추 회사 구글 캘린더 · 할 일 포함 · 읽기 전용
      </p>
    </div>
  );
}
