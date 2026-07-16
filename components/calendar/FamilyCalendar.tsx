"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import {
  currentYearMonth,
  daysInMonth,
  todayISO,
  weekNumOf,
  weekLabel,
  ddayLabel,
} from "@/lib/format";
import { occurrencesByDate, type EventOccurrence } from "@/lib/calendar";
import type { FamilyEvent, WeekTodo } from "@/lib/types";
import { todoAssigneeName } from "@/lib/types";
import { readableText } from "@/lib/eventCategoryPalette";
import { Card, MonthSwitcher, Pill } from "@/components/budget/ui";
import { WeekTodoForm, TodoActionSheet } from "@/components/todo52/forms";
import EventForm from "./EventForm";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
        on ? "border-leaf bg-leaf text-white" : "border-line text-transparent"
      }`}
    >
      ✓
    </button>
  );
}

export default function FamilyCalendar() {
  const { loading, familyEvents, weekTodos, eventCategories } = useData();
  const catById = useMemo(
    () => new Map(eventCategories.map((c) => [c.id, c])),
    [eventCategories]
  );
  const catColor = (id: string) => catById.get(id)?.color ?? "#7c766a";
  const [ym, setYm] = useState(currentYearMonth());
  const [selected, setSelected] = useState<string | null>(todayISO());
  const [eventForm, setEventForm] = useState<{
    open: boolean;
    initial?: FamilyEvent;
    defaultDate?: string;
    defaultEndDate?: string;
    occurrenceDate?: string;
  }>({ open: false });
  const [todoForm, setTodoForm] = useState<WeekTodo | null>(null);
  const [actionTodo, setActionTodo] = useState<WeekTodo | null>(null);

  /* ── 그리드 드래그로 일정 추가 ──
     마우스: 누른 채 다른 날짜로 끌면 바로 범위 선택.
     터치: 0.4초 길게 누르면 드래그 모드(그 전에 움직이면 일반 스크롤).
     손을 떼면 시작~끝이 채워진 일정 폼이 열린다. */
  const [drag, setDrag] = useState<{ start: string; end: string } | null>(null);
  const dragRef = useRef<{ start: string; end: string } | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);
  const pendingRef = useRef<{
    iso: string;
    x: number;
    y: number;
    touch: boolean;
  } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const isoAtPoint = (x: number, y: number): string | null =>
    (document.elementFromPoint(x, y)?.closest("[data-iso]") as HTMLElement | null)
      ?.dataset.iso ?? null;

  function clearPending() {
    pendingRef.current = null;
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function onGridPointerDown(e: React.PointerEvent) {
    const iso = (e.target as HTMLElement).closest("[data-iso]")
      ? ((e.target as HTMLElement).closest("[data-iso]") as HTMLElement).dataset.iso
      : null;
    if (!iso) return;
    const touch = e.pointerType !== "mouse";
    pendingRef.current = { iso, x: e.clientX, y: e.clientY, touch };
    if (touch) {
      longPressRef.current = setTimeout(() => {
        if (pendingRef.current?.iso === iso) setDrag({ start: iso, end: iso });
      }, 400);
    }
  }

  function onGridPointerMove(e: React.PointerEvent) {
    if (drag) {
      const iso = isoAtPoint(e.clientX, e.clientY);
      if (iso && iso !== drag.end) setDrag({ ...drag, end: iso });
      return;
    }
    const p = pendingRef.current;
    if (!p) return;
    const moved = Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
    if (p.touch) {
      // 길게 누르기 전에 움직이면 스크롤 의도 — 드래그 취소
      if (moved > 12) clearPending();
    } else if (moved > 4) {
      // 마우스는 움직이는 즉시 드래그 시작
      const iso = isoAtPoint(e.clientX, e.clientY) ?? p.iso;
      setDrag({ start: p.iso, end: iso });
      clearPending();
    }
  }

  function finishDrag() {
    clearPending();
    const d = dragRef.current;
    if (!d) return;
    setDrag(null);
    suppressClickRef.current = true;
    const [s, e2] = d.start <= d.end ? [d.start, d.end] : [d.end, d.start];
    setEventForm({
      open: true,
      defaultDate: s,
      defaultEndDate: e2 !== s ? e2 : undefined,
    });
  }

  function cancelDrag() {
    clearPending();
    setDrag(null);
  }

  // 드래그 중 화면 스크롤 차단 (React 터치 리스너는 passive라 네이티브로 부착)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", block, { passive: false });
    return () => el.removeEventListener("touchmove", block);
  }, []);

  // 드래그 범위 [시작, 끝] (정렬)
  const dragRange = useMemo(() => {
    if (!drag) return null;
    return drag.start <= drag.end
      ? ([drag.start, drag.end] as const)
      : ([drag.end, drag.start] as const);
  }, [drag]);

  const today = todayISO();
  const from = `${ym}-01`;
  const to = `${ym}-${String(daysInMonth(ym)).padStart(2, "0")}`;

  // 일정 전개 (반복 포함) → 날짜별
  const occMap = useMemo(
    () => occurrencesByDate(familyEvents, from, to),
    [familyEvents, from, to]
  );

  // 기한 있는 미완료 투두 → 날짜별 (gold 마커)
  const todoDue = useMemo(() => {
    const m = new Map<string, WeekTodo[]>();
    for (const t of weekTodos) {
      if (t.status !== "pending" || !t.dueDate) continue;
      if (t.dueDate < from || t.dueDate > to) continue;
      m.set(t.dueDate, [...(m.get(t.dueDate) ?? []), t]);
    }
    return m;
  }, [weekTodos, from, to]);

  // 선택한 날짜가 속한 주의 투두 (미완료)
  const selectedWeekTodos = useMemo(() => {
    if (!selected) return [];
    const y = Number(selected.slice(0, 4));
    const w = weekNumOf(selected);
    return weekTodos
      .filter((t) => t.year === y && t.weekNum === w && t.status === "pending")
      .sort((a, b) => ((a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1));
  }, [weekTodos, selected]);

  const selectedOccs = useMemo(() => {
    if (!selected) return [];
    const occs = occMap.get(selected) ?? [];
    // 종일 먼저, 그다음 시간순
    return [...occs].sort((a, b) => {
      const ta = a.event.time ?? "";
      const tb = b.event.time ?? "";
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
  }, [occMap, selected]);

  // 월 그리드 셀
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth(ym) }, (_, i) => i + 1),
  ];

  if (loading) {
    return <div className="py-20 text-center text-sm text-stone">불러오는 중…</div>;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() =>
          setEventForm({ open: true, defaultDate: selected ?? today })
        }
        className="w-full rounded-2xl bg-leaf py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
      >
        + 일정
      </button>

      <div className="mb-3 px-1">
        <MonthSwitcher
          ym={ym}
          onChange={(next) => {
            setYm(next);
            setSelected(null);
          }}
        />
      </div>
      <div className="-mx-4">
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-stone">
          {WEEK.map((w, i) => (
            <span key={w} className={i === 0 ? "text-coral" : i === 6 ? "text-sky" : ""}>
              {w}
            </span>
          ))}
        </div>
        <div
          ref={gridRef}
          className="grid select-none grid-cols-7"
          style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onPointerLeave={() => {
            if (!drag) clearPending();
          }}
          onClickCapture={(e) => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {cells.map((day, idx) => {
            if (day === null) return <span key={`e${idx}`} className="border-t border-line" />;
            const iso = `${ym}-${String(day).padStart(2, "0")}`;
            const occs = occMap.get(iso) ?? [];
            const inDrag = dragRange && iso >= dragRange[0] && iso <= dragRange[1];
            return (
              <button
                key={day}
                data-iso={iso}
                onClick={() => setSelected((p) => (p === iso ? null : iso))}
                className={`flex min-h-[76px] flex-col items-center rounded-lg border-t border-line pt-1 transition-colors ${
                  inDrag ? "bg-leaf-light" : ""
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                    iso === today ? "bg-leaf font-bold text-white" : "text-ink"
                  } ${selected === iso ? "ring-2 ring-leaf ring-offset-1" : ""}`}
                >
                  {day}
                </span>
                <div className="mt-0.5 w-full space-y-0.5 px-0.5">
                  {(() => {
                    const items: { color: string; label: string }[] = [
                      ...occs.map((o) => ({
                        color: catColor(o.event.categoryId),
                        label: o.event.title,
                      })),
                      ...(todoDue.get(iso) ?? []).map((t) => ({
                        color: "#d9a441",
                        label: t.title,
                      })),
                    ];
                    const shown = items.slice(0, 3);
                    const extra = items.length - shown.length;
                    return (
                      <>
                        {shown.map((it, i) => (
                          <span
                            key={i}
                            className="block truncate rounded px-1 text-left text-[9px] leading-tight"
                            style={{ backgroundColor: it.color, color: readableText(it.color) }}
                          >
                            {it.label}
                          </span>
                        ))}
                        {extra > 0 && (
                          <span className="block px-1 text-left text-[9px] leading-tight text-stone">
                            +{extra}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {drag && (
        <p className="mt-2 text-center text-[11px] font-semibold text-leaf-dark">
          {Number(dragRange![0].slice(5, 7))}/{Number(dragRange![0].slice(8, 10))}
          {dragRange![0] !== dragRange![1] &&
            ` ~ ${Number(dragRange![1].slice(5, 7))}/${Number(dragRange![1].slice(8, 10))}`}{" "}
          일정 추가 — 손을 떼면 입력창이 열려요
        </p>
      )}
      {/* 범례 */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone">
        {eventCategories.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]" />
          투두 기한
        </span>
      </div>

      {selected && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">
              {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 (
              {WEEK[new Date(selected).getDay()]})
            </p>
            <button
              onClick={() => setEventForm({ open: true, defaultDate: selected })}
              className="text-xs font-bold text-leaf-dark"
            >
              + 이 날 일정
            </button>
          </div>

          {selectedOccs.length === 0 ? (
            <p className="py-2 text-center text-xs text-stone">일정이 없어요</p>
          ) : (
            <div className="space-y-2">
              {selectedOccs.map((o: EventOccurrence, i) => (
                <button
                  key={`${o.event.id}-${i}`}
                  onClick={() =>
                    setEventForm({
                      open: true,
                      initial: o.event,
                      occurrenceDate: o.date,
                    })
                  }
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: catColor(o.event.categoryId) }}
                  />
                  <span className="w-11 shrink-0 text-xs font-semibold text-stone">
                    {o.event.time ?? "종일"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {o.event.title}
                    {o.dates.length > 1 && (
                      <span className="ml-1 text-[11px] font-normal text-stone">
                        ({o.dates.length}일)
                      </span>
                    )}
                  </span>
                  <span className="text-sm">{catById.get(o.event.categoryId)?.emoji ?? ""}</span>
                  {o.event.recurrence !== "none" && <Pill tone="stone">반복</Pill>}
                </button>
              ))}
            </div>
          )}

          {/* 이번 주 52주 투두 */}
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-xs font-bold text-stone">
              {weekLabel(Number(selected.slice(0, 4)), weekNumOf(selected))} 투두
            </p>
            {selectedWeekTodos.length === 0 ? (
              <p className="py-1 text-center text-xs text-stone">
                이 주의 미완료 투두가 없어요
              </p>
            ) : (
              <div className="space-y-2">
                {selectedWeekTodos.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <Check on={false} onClick={() => setActionTodo(t)} />
                    <button
                      onClick={() => setTodoForm(t)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink"
                    >
                      {t.title}
                      <span className="ml-1 text-[11px] font-normal text-stone">
                        {todoAssigneeName(t.assignee)}
                      </span>
                    </button>
                    {t.dueDate && (
                      <Pill tone={t.dueDate < today ? "coral" : "gold"}>
                        {ddayLabel(t.dueDate)}
                      </Pill>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {eventForm.open && (
        <EventForm
          key={eventForm.initial?.id ?? `new-${eventForm.defaultDate}-${eventForm.defaultEndDate ?? ""}`}
          open={eventForm.open}
          onClose={() => setEventForm({ open: false })}
          initial={eventForm.initial}
          defaultDate={eventForm.defaultDate}
          defaultEndDate={eventForm.defaultEndDate}
          occurrenceDate={eventForm.occurrenceDate}
        />
      )}

      {todoForm && (
        <WeekTodoForm
          key={todoForm.id}
          open={!!todoForm}
          onClose={() => setTodoForm(null)}
          year={todoForm.year}
          defaultWeek={todoForm.weekNum}
          initial={todoForm}
        />
      )}

      {actionTodo && (
        <TodoActionSheet
          key={actionTodo.id}
          open={!!actionTodo}
          onClose={() => setActionTodo(null)}
          todo={actionTodo}
          year={actionTodo.year}
        />
      )}
    </div>
  );
}
