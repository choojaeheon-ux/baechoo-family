"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { currentYearMonth } from "@/lib/format";
import type { UjuChecklist } from "@/lib/types";
import { SectionTitle } from "@/components/budget/ui";
import BaechooCalendar from "@/components/baechoo/BaechooCalendar";
import UjuChecklistList from "./UjuChecklistList";
import { UjuChecklistForm } from "./forms";

export default function UjuDashboard() {
  const { ujuChecklists } = useData();
  const [ym, setYm] = useState(currentYearMonth());
  const [form, setForm] = useState<{ open: boolean; initial?: UjuChecklist }>({
    open: false,
  });

  const markedDates = useMemo(
    () => new Set(ujuChecklists.map((c) => c.dueDate)),
    [ujuChecklists]
  );

  function renderDay(iso: string) {
    const items = ujuChecklists.filter((c) => c.dueDate === iso);
    if (items.length === 0)
      return <p className="text-sm text-stone">이 날 예정된 항목이 없어요.</p>;
    return (
      <div className="space-y-1.5">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => setForm({ open: true, initial: c })}
            className="flex w-full items-center gap-2 text-left"
          >
            <span className={c.done ? "text-leaf" : "text-stone"}>
              {c.done ? "✓" : "○"}
            </span>
            <span
              className={`flex-1 truncate text-sm ${
                c.done ? "text-stone line-through" : "font-semibold text-ink"
              }`}
            >
              {c.title}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>기한 캘린더</SectionTitle>
      <BaechooCalendar
        ym={ym}
        onYmChange={setYm}
        markedDates={markedDates}
        renderDay={renderDay}
      />

      <SectionTitle>전체 D-day</SectionTitle>
      <UjuChecklistList onEdit={(c) => setForm({ open: true, initial: c })} />

      {form.open && (
        <UjuChecklistForm
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
