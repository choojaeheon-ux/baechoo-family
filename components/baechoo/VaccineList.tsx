"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { todayISO, addMonths, dday, ddayLabel } from "@/lib/format";
import { STANDARD_VACCINES, type BaechooVaccine } from "@/lib/types";
import { Card, Pill, SectionTitle } from "@/components/budget/ui";
import { VaccineDetailSheet } from "./forms";
import { latestDose, nextDoseNumber } from "@/lib/vaccine";

// 체크 동그라미 (HealthTodos 패턴)
function Check({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line text-xs text-transparent transition"
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

  // 다음 예정일 가까운 순. 미접종(nextDue=null)은 뒤로.
  const sorted = useMemo(
    () =>
      [...baechooVaccines].sort((a, b) => {
        if (!a.nextDue && !b.nextDue) return a.name < b.name ? -1 : 1;
        if (!a.nextDue) return 1;
        if (!b.nextDue) return -1;
        return a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : 0;
      }),
    [baechooVaccines]
  );

  // 빠른 기록: 다음 차수를 오늘 날짜로 추가 + 다음 예정일 = 오늘+주기
  async function complete(v: BaechooVaccine) {
    const today = todayISO();
    await saveBaechooVaccine({
      ...v,
      doses: [...v.doses, { n: nextDoseNumber(v.doses), date: today }],
      nextDue: addMonths(today, v.intervalMonths),
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
          nextDue: null,
          intervalMonths: 12,
          doses: [],
          memo: null,
          createdAt: todayISO(),
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
              const left = v.nextDue ? dday(v.nextDue) : null;
              const last = latestDose(v.doses);
              return (
                <div key={v.id} className="flex items-center gap-3">
                  <Check onClick={() => complete(v)} />
                  <button
                    onClick={() => setForm({ open: true, initial: v })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-ink">
                      {v.name}
                    </span>
                    <span className="block text-[11px] text-stone">
                      {last ? `최근 ${last.n}차 · ${last.date}` : "접종 기록 없음"}
                    </span>
                  </button>
                  {left === null ? (
                    <Pill tone="stone">{last ? "예정 없음" : "미접종"}</Pill>
                  ) : (
                    <Pill tone={left < 0 ? "coral" : left <= 30 ? "gold" : "stone"}>
                      {ddayLabel(v.nextDue!)}
                    </Pill>
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
