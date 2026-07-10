"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, dday, ddayLabel } from "@/lib/format";
import { STANDARD_VACCINES, type BaechooVaccine } from "@/lib/types";
import { Card, Pill, SectionTitle } from "@/components/budget/ui";
import { VaccineDetailSheet } from "./forms";
import { vaccineDone, vaccineNextDue } from "@/lib/vaccine";

// 체크 동그라미 (HealthTodos 패턴)
function Check({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={checked ? "접종 취소" : "오늘 접종 체크"}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
        checked ? "border-leaf bg-leaf text-white" : "border-line text-transparent"
      }`}
    >
      ✓
    </button>
  );
}

export default function VaccineList() {
  const { baechooVaccines, saveBaechooVaccine } = useData();
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooVaccine }>({
    open: false,
  });
  const [seeding, setSeeding] = useState(false);
  const today = todayISO();

  // 리마인드가 목적이므로 미완료를 위로. 기한 지남 → 미접종 → 접종 완료.
  const sorted = useMemo(() => {
    const rank = (v: BaechooVaccine) =>
      vaccineDone(v.lastDone, today) ? 2 : v.lastDone ? 0 : 1;
    return [...baechooVaccines].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 1) return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      const da = vaccineNextDue(a.lastDone)!;
      const db = vaccineNextDue(b.lastDone)!;
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }, [baechooVaccines, today]);

  // 체크 = 오늘 접종. 해제 = 미접종으로 되돌림.
  async function toggle(v: BaechooVaccine) {
    await saveBaechooVaccine({
      ...v,
      lastDone: vaccineDone(v.lastDone, today) ? null : today,
    });
  }

  // 표준 백신 일괄 추가 (이미 있는 이름은 건너뜀)
  async function addStandard() {
    setSeeding(true);
    try {
      const existing = new Set(baechooVaccines.map((v) => v.name));
      for (const name of STANDARD_VACCINES) {
        if (existing.has(name)) continue;
        await saveBaechooVaccine({
          id: "",
          name,
          lastDone: null,
          memo: null,
          createdAt: today,
        });
      }
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <SectionTitle
        right={
          <button
            onClick={() => setForm({ open: true })}
            className="text-xs font-bold text-leaf-dark"
          >
            + 백신
          </button>
        }
      >
        예방접종
      </SectionTitle>

      {sorted.length === 0 ? (
        <Card>
          <p className="py-1 text-center text-sm text-stone">
            예방접종을 체크리스트로 관리해 보세요.
          </p>
          <button
            onClick={addStandard}
            disabled={seeding}
            className="mt-2 w-full rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-2.5 text-sm font-bold text-leaf-dark active:scale-[0.99] disabled:opacity-50"
          >
            표준 백신 추가 (배추 정기 5종)
          </button>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {sorted.map((v) => {
              const done = vaccineDone(v.lastDone, today);
              const due = vaccineNextDue(v.lastDone);
              return (
                <div key={v.id} className="flex items-center gap-3">
                  <Check checked={done} onClick={() => toggle(v)} />
                  <button
                    onClick={() => setForm({ open: true, initial: v })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-ink">
                      {v.name}
                    </span>
                    <span className="block text-[11px] text-stone">
                      {!v.lastDone
                        ? "접종 기록 없음"
                        : done
                          ? `${v.lastDone} 접종 · 다음 ${due}`
                          : `${v.lastDone} 접종`}
                    </span>
                  </button>
                  {done && due ? (
                    <Pill tone={dday(due) <= 30 ? "gold" : "stone"}>
                      {ddayLabel(due)}
                    </Pill>
                  ) : (
                    <Pill tone="coral">접종 필요</Pill>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {form.open && (
        <VaccineDetailSheet
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
