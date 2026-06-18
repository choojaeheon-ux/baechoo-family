"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { weekdayKo, ddayLabel, currentYearMonth } from "@/lib/format";
import { HEALTH_TYPE_LABEL, type HealthType, type BaechooHealth } from "@/lib/types";
import { Card, Empty, Pill } from "@/components/budget/ui";
import { HealthForm } from "./forms";
import HealthTodos from "./HealthTodos";
import BaechooCalendar from "./BaechooCalendar";
import ViewToggle from "./ViewToggle";

function dateLabel(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} (${weekdayKo(iso)})`;
}

// 종류별 Pill 색
const TONE: Record<HealthType, "leaf" | "coral" | "stone" | "gold" | "sky"> = {
  hospital: "coral",
  vaccine: "sky",
  medicine: "coral",
  supplement: "leaf",
  symptom: "gold",
  note: "stone",
  dental: "leaf",
  etc: "stone",
};

function HealthCard({ r, onClick }: { r: BaechooHealth; onClick: () => void }) {
  return (
    <Card className="cursor-pointer active:scale-[0.99]">
      <div onClick={onClick}>
        <div className="flex items-center gap-2">
          <Pill tone={TONE[r.healthType]}>{HEALTH_TYPE_LABEL[r.healthType]}</Pill>
          <span className="flex-1 truncate text-sm font-semibold text-ink">
            {r.title}
          </span>
          {r.nextDate && (
            <span className="text-xs font-semibold text-stone">
              다음 {ddayLabel(r.nextDate)}
            </span>
          )}
        </div>
        {r.memo && <p className="mt-1 text-xs text-stone">{r.memo}</p>}
      </div>
    </Card>
  );
}

export default function HealthList() {
  const { baechooHealth } = useData();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [ym, setYm] = useState(currentYearMonth());
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooHealth }>({
    open: false,
  });

  const sorted = useMemo(
    () =>
      [...baechooHealth].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      ),
    [baechooHealth]
  );

  const groups = useMemo(() => {
    const m = new Map<string, BaechooHealth[]>();
    for (const r of sorted) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [sorted]);

  const markedDates = useMemo(
    () => new Set(baechooHealth.map((r) => r.date)),
    [baechooHealth]
  );

  const openEdit = (r: BaechooHealth) => setForm({ open: true, initial: r });

  return (
    <div className="space-y-4">
      {/* 할 일 (약·접종 D-day + 매일 양치) */}
      <HealthTodos />

      <button
        onClick={() => setForm({ open: true })}
        className="w-full rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-3 text-sm font-bold text-leaf-dark active:scale-[0.99]"
      >
        + 건강 기록
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
              return <Empty>이 날은 건강 기록이 없어요.</Empty>;
            return (
              <div className="space-y-2">
                {items.map((r) => (
                  <HealthCard key={r.id} r={r} onClick={() => openEdit(r)} />
                ))}
              </div>
            );
          }}
        />
      ) : groups.length === 0 ? (
        <Empty>아직 건강 기록이 없어요. 위 버튼으로 추가해 보세요.</Empty>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-1.5 px-1 text-xs font-bold text-stone">
              {dateLabel(date)}
            </p>
            <div className="space-y-2">
              {items.map((r) => (
                <HealthCard key={r.id} r={r} onClick={() => openEdit(r)} />
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
