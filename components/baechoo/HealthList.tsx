"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { weekdayKo, ddayLabel, dday } from "@/lib/format";
import { HEALTH_TYPE_LABEL, type HealthType, type BaechooHealth } from "@/lib/types";
import { Card, Empty, Pill } from "@/components/budget/ui";
import { HealthForm } from "./forms";

function dateLabel(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} (${weekdayKo(iso)})`;
}

// 종류별 Pill 색
const TONE: Record<HealthType, "leaf" | "coral" | "stone" | "gold" | "sky"> = {
  hospital: "coral",
  vaccine: "sky",
  medicine: "coral",
  symptom: "gold",
  note: "stone",
  dental: "leaf",
  etc: "stone",
};

export default function HealthList() {
  const { baechooHealth } = useData();
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooHealth }>({
    open: false,
  });

  // 다가오는 예정일 (오늘 이후, 가까운 순)
  const upcoming = useMemo(
    () =>
      baechooHealth
        .filter((r) => r.nextDate && dday(r.nextDate) >= 0)
        .sort((a, b) => (a.nextDate! < b.nextDate! ? -1 : 1)),
    [baechooHealth]
  );

  const groups = useMemo(() => {
    const sorted = [...baechooHealth].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
    const m = new Map<string, BaechooHealth[]>();
    for (const r of sorted) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [baechooHealth]);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setForm({ open: true })}
        className="w-full rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-3 text-sm font-bold text-leaf-dark active:scale-[0.99]"
      >
        + 건강 기록
      </button>

      {/* 다가오는 예정일 */}
      {upcoming.length > 0 && (
        <Card className="border-coral/40 bg-coral-light/30">
          <p className="mb-2 text-xs font-bold text-coral">다가오는 예정일</p>
          <div className="space-y-1.5">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <Pill tone={TONE[r.healthType]}>
                  {HEALTH_TYPE_LABEL[r.healthType]}
                </Pill>
                <span className="flex-1 truncate text-ink">{r.title}</span>
                <span className="text-xs font-bold text-coral">
                  {ddayLabel(r.nextDate!)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {groups.length === 0 ? (
        <Empty>아직 건강 기록이 없어요. 위 버튼으로 추가해 보세요.</Empty>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-1.5 px-1 text-xs font-bold text-stone">
              {dateLabel(date)}
            </p>
            <div className="space-y-2">
              {items.map((r) => (
                <Card key={r.id} className="cursor-pointer active:scale-[0.99]">
                  <div onClick={() => setForm({ open: true, initial: r })}>
                    <div className="flex items-center gap-2">
                      <Pill tone={TONE[r.healthType]}>
                        {HEALTH_TYPE_LABEL[r.healthType]}
                      </Pill>
                      <span className="flex-1 truncate text-sm font-semibold text-ink">
                        {r.title}
                      </span>
                      {r.nextDate && (
                        <span className="text-xs font-semibold text-stone">
                          다음 {ddayLabel(r.nextDate)}
                        </span>
                      )}
                    </div>
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
        <HealthForm
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
