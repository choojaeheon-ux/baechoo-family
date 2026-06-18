"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { weekdayKo, currentYearMonth } from "@/lib/format";
import { MEAL_TYPE_LABEL, type BaechooMeal } from "@/lib/types";
import { Card, Empty, Pill } from "@/components/budget/ui";
import { MealForm } from "./forms";
import BaechooCalendar from "./BaechooCalendar";
import ViewToggle from "./ViewToggle";

// "6/18 (목)"
function dateLabel(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} (${weekdayKo(iso)})`;
}

function MealCard({
  r,
  onClick,
}: {
  r: BaechooMeal;
  onClick: () => void;
}) {
  return (
    <Card className="cursor-pointer active:scale-[0.99]">
      <div onClick={onClick}>
        <div className="flex items-center gap-2">
          <Pill tone={r.mealType === "snack" ? "gold" : "leaf"}>
            {MEAL_TYPE_LABEL[r.mealType]}
          </Pill>
          {r.time && <span className="text-xs text-stone">{r.time}</span>}
          <span className="flex-1 truncate text-sm font-semibold text-ink">
            {r.content}
          </span>
        </div>
        {(r.topping || r.amount) && (
          <p className="mt-1.5 text-xs text-stone">
            {r.topping && <span>토핑: {r.topping}</span>}
            {r.topping && r.amount && <span> · </span>}
            {r.amount && <span>먹은 양: {r.amount}</span>}
          </p>
        )}
        {r.memo && <p className="mt-1 text-xs text-stone">{r.memo}</p>}
      </div>
    </Card>
  );
}

export default function MealList() {
  const { baechooMeals } = useData();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [ym, setYm] = useState(currentYearMonth());
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooMeal }>({
    open: false,
  });

  const sorted = useMemo(
    () =>
      [...baechooMeals].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return (b.time ?? "") < (a.time ?? "") ? -1 : 1;
      }),
    [baechooMeals]
  );

  // 날짜별 그룹 (리스트 뷰)
  const groups = useMemo(() => {
    const m = new Map<string, BaechooMeal[]>();
    for (const r of sorted) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [sorted]);

  const markedDates = useMemo(
    () => new Set(baechooMeals.map((r) => r.date)),
    [baechooMeals]
  );

  const openEdit = (r: BaechooMeal) => setForm({ open: true, initial: r });

  return (
    <div className="space-y-4">
      <button
        onClick={() => setForm({ open: true })}
        className="w-full rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-3 text-sm font-bold text-leaf-dark active:scale-[0.99]"
      >
        + 식사·간식 기록
      </button>

      <ViewToggle view={view} onChange={setView} />

      {view === "calendar" ? (
        <BaechooCalendar
          ym={ym}
          onYmChange={setYm}
          markedDates={markedDates}
          renderDay={(iso) => {
            const items = sorted.filter((r) => r.date === iso);
            if (items.length === 0)
              return <Empty>이 날은 식사 기록이 없어요.</Empty>;
            return (
              <div className="space-y-2">
                {items.map((r) => (
                  <MealCard key={r.id} r={r} onClick={() => openEdit(r)} />
                ))}
              </div>
            );
          }}
        />
      ) : groups.length === 0 ? (
        <Empty>아직 식사 기록이 없어요. 위 버튼으로 추가해 보세요.</Empty>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-1.5 px-1 text-xs font-bold text-stone">
              {dateLabel(date)}
            </p>
            <div className="space-y-2">
              {items.map((r) => (
                <MealCard key={r.id} r={r} onClick={() => openEdit(r)} />
              ))}
            </div>
          </div>
        ))
      )}

      {form.open && (
        <MealForm
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
