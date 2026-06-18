"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { weekdayKo } from "@/lib/format";
import { MEAL_TYPE_LABEL, type BaechooMeal } from "@/lib/types";
import { Card, Empty, Pill } from "@/components/budget/ui";
import { MealForm } from "./forms";

// "6/18 (목)"
function dateLabel(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} (${weekdayKo(iso)})`;
}

export default function MealList() {
  const { baechooMeals } = useData();
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooMeal }>({
    open: false,
  });

  // 날짜 내림차순 → 시간 내림차순 그룹
  const groups = useMemo(() => {
    const sorted = [...baechooMeals].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.time ?? "") < (a.time ?? "") ? -1 : 1;
    });
    const m = new Map<string, BaechooMeal[]>();
    for (const r of sorted) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [baechooMeals]);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setForm({ open: true })}
        className="w-full rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-3 text-sm font-bold text-leaf-dark active:scale-[0.99]"
      >
        + 식사·간식 기록
      </button>

      {groups.length === 0 ? (
        <Empty>아직 식사 기록이 없어요. 위 버튼으로 추가해 보세요.</Empty>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-1.5 px-1 text-xs font-bold text-stone">
              {dateLabel(date)}
            </p>
            <div className="space-y-2">
              {items.map((r) => (
                <Card
                  key={r.id}
                  className="cursor-pointer active:scale-[0.99]"
                >
                  <div onClick={() => setForm({ open: true, initial: r })}>
                    <div className="flex items-center gap-2">
                      <Pill tone={r.mealType === "snack" ? "gold" : "leaf"}>
                        {MEAL_TYPE_LABEL[r.mealType]}
                      </Pill>
                      {r.time && (
                        <span className="text-xs text-stone">{r.time}</span>
                      )}
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
                    {r.memo && (
                      <p className="mt-1 text-xs text-stone">{r.memo}</p>
                    )}
                  </div>
                </Card>
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
