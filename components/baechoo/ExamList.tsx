"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useData } from "@/lib/data-context";
import { weekdayKo } from "@/lib/format";
import { EXAM_TYPE_LABEL, type BaechooExam } from "@/lib/types";
import { Card, Empty, Pill, SectionTitle } from "@/components/budget/ui";
import { ExamForm } from "./forms";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

function dateLabel(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))} (${weekdayKo(iso)})`;
}

export default function ExamList() {
  const { baechooExams } = useData();
  const [form, setForm] = useState<{ open: boolean; initial?: BaechooExam }>({
    open: false,
  });

  // 체중 추이 (측정 기록만, 날짜 오름차순)
  const weightSeries = useMemo(
    () =>
      baechooExams
        .filter((r) => r.examType === "measure" && r.weight != null)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [baechooExams]
  );

  const latest = weightSeries[weightSeries.length - 1];

  // 전체 기록 날짜 내림차순 그룹
  const groups = useMemo(() => {
    const sorted = [...baechooExams].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
    const m = new Map<string, BaechooExam[]>();
    for (const r of sorted) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [baechooExams]);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setForm({ open: true })}
        className="w-full rounded-xl border border-dashed border-leaf bg-leaf-light/40 py-3 text-sm font-bold text-leaf-dark active:scale-[0.99]"
      >
        + 신체검사 기록
      </button>

      {/* 체중 추이 차트 */}
      {weightSeries.length >= 2 && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">체중 추이</span>
            {latest && (
              <span className="text-sm font-bold text-leaf-dark">
                최근 {latest.weight}kg
              </span>
            )}
          </div>
          <div className="h-44">
            <Line
              data={{
                labels: weightSeries.map(
                  (r) => `${Number(r.date.slice(5, 7))}/${Number(r.date.slice(8, 10))}`
                ),
                datasets: [
                  {
                    data: weightSeries.map((r) => r.weight as number),
                    borderColor: "#5b8c3e",
                    backgroundColor: "rgba(91,140,62,0.12)",
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: "#5b8c3e",
                    pointRadius: 3,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (c) => ` ${c.parsed.y}kg` } },
                },
                scales: {
                  y: { ticks: { callback: (v) => `${v}kg` } },
                },
              }}
            />
          </div>
        </Card>
      )}

      {groups.length === 0 ? (
        <Empty>아직 신체검사 기록이 없어요. 위 버튼으로 추가해 보세요.</Empty>
      ) : (
        <div>
          <SectionTitle>기록</SectionTitle>
          {groups.map(([date, items]) => (
            <div key={date} className="mb-3">
              <p className="mb-1.5 px-1 text-xs font-bold text-stone">
                {dateLabel(date)}
              </p>
              <div className="space-y-2">
                {items.map((r) => (
                  <Card key={r.id} className="cursor-pointer active:scale-[0.99]">
                    <div onClick={() => setForm({ open: true, initial: r })}>
                      <div className="flex items-center gap-2">
                        <Pill tone={r.examType === "measure" ? "sky" : "leaf"}>
                          {EXAM_TYPE_LABEL[r.examType]}
                        </Pill>
                        <span className="flex-1 truncate text-sm font-semibold text-ink">
                          {r.examType === "measure"
                            ? `${r.weight}kg`
                            : r.content}
                        </span>
                      </div>
                      {r.memo && (
                        <p className="mt-1 text-xs text-stone">{r.memo}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {form.open && (
        <ExamForm
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
