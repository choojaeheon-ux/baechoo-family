"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeYearPnl, type YearPnl } from "@/lib/pnl";
import { currentYearMonth, won } from "@/lib/format";
import { Card, SectionTitle } from "@/components/budget/ui";
import YearChart from "./YearChart";

// 표 안에서는 ₩ 없이 숫자만 — 13열을 가로로 늘어놓아야 해서 폭이 아깝다
function num(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}
function pctText(p: number | null): string {
  return p === null ? "—" : `${p.toFixed(1)}%`;
}

// 금액 행
type NumRow = {
  label: string;
  values: number[]; // 1~12월
  total: number;
  strong?: boolean;
  signed?: boolean; // 음수를 빨강으로
};

export default function YearPnl() {
  const { transactions, categories, budgets, budgetVersions, categoryById } = useData();
  const [year, setYear] = useState(() => Number(currentYearMonth().slice(0, 4)));
  const scrollRef = useRef<HTMLDivElement>(null);

  const y: YearPnl = useMemo(
    () => computeYearPnl(transactions, categoryById, budgets, budgetVersions, categories, year),
    [transactions, categoryById, budgets, budgetVersions, categories, year]
  );

  // 올해를 보면 이번 달이 바로 보이게 가로 스크롤을 맞춘다.
  // (안 하면 1월부터 보여서 아직 안 쓴 빈 달만 뜬다)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nowYm = currentYearMonth();
    if (Number(nowYm.slice(0, 4)) !== year) {
      el.scrollLeft = 0;
      return;
    }
    const cell = el.querySelector<HTMLElement>(`[data-col="${nowYm}"]`);
    const totalCell = el.querySelector<HTMLElement>(`[data-col="total"]`);
    if (!cell) return;
    const totalW = totalCell?.offsetWidth ?? 0;
    el.scrollLeft = Math.max(
      0,
      cell.offsetLeft + cell.offsetWidth + totalW - el.clientWidth
    );
  }, [year]);

  const pnlRows: NumRow[] = [
    { label: "매출", values: y.months.map((m) => m.summary.revenue), total: y.total.revenue },
    { label: "고정비", values: y.months.map((m) => m.summary.fixed), total: y.total.fixed },
    { label: "선저축", values: y.months.map((m) => m.summary.saving), total: y.total.saving },
    {
      label: "가처분이익",
      values: y.months.map((m) => m.summary.grossProfit),
      total: y.total.grossProfit,
      signed: true,
    },
    { label: "변동비", values: y.months.map((m) => m.summary.variable), total: y.total.variable },
    {
      label: "운영이익",
      values: y.months.map((m) => m.summary.operatingProfit),
      total: y.total.operatingProfit,
      strong: true,
      signed: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 연도 스위처 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setYear((v) => v - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone hover:bg-leaf-light"
        >
          ‹
        </button>
        <span className="min-w-28 text-center text-base font-bold text-ink">
          {year}년 실적
        </span>
        <button
          onClick={() => setYear((v) => v + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone hover:bg-leaf-light"
        >
          ›
        </button>
      </div>

      {/* 월별 손익표 — 화면이 좁으므로 표만 가로로 스크롤한다.
          항목 열은 왼쪽에, 합계 열은 오른쪽에 고정해서 어디로 스크롤해도 기준이 남는다 */}
      <Card className="!p-0">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-max min-w-full border-collapse text-right text-xs tabular">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-20 bg-card px-3 py-2 text-left font-semibold text-stone">
                  항목
                </th>
                {y.months.map((m) => (
                  <th
                    key={m.ym}
                    data-col={m.ym}
                    className="whitespace-nowrap px-2.5 py-2 font-semibold text-stone"
                  >
                    {Number(m.ym.slice(5))}월
                  </th>
                ))}
                <th
                  data-col="total"
                  className="sticky right-0 z-20 whitespace-nowrap border-l border-line bg-cream px-3 py-2 font-bold text-ink"
                >
                  합계
                </th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.map((r) => (
                <NumberRow key={r.label} row={r} />
              ))}

              <SubRow
                label="운영이익률"
                values={y.months.map((m) =>
                  m.summary.revenue > 0
                    ? `${(m.summary.operatingMargin * 100).toFixed(1)}%`
                    : "—"
                )}
                total={
                  y.total.revenue > 0
                    ? `${(y.total.operatingMargin * 100).toFixed(1)}%`
                    : "—"
                }
                divider
              />

              <NumberRow
                row={{
                  label: "지출예산",
                  values: y.months.map((m) => m.budget),
                  total: y.budget,
                }}
                topBorder
              />
              <SubRow
                label="소진률"
                values={y.months.map((m) => pctText(m.burnPct))}
                total={pctText(y.burnPct)}
                warn={y.months.map((m) => m.burnPct !== null && m.burnPct > 100)}
                warnTotal={y.burnPct !== null && y.burnPct > 100}
              />
            </tbody>
          </table>
        </div>
      </Card>

      <p className="px-1 text-[11px] text-stone">
        지출예산 = 그 달에 적용되는 예산 버전의 계정과목별 예산 합. 소진률 분자는 예산을
        안 잡은 과목의 지출까지 포함합니다(가계부 대시보드와 같은 기준).
      </p>

      {/* 연 추이 그래프 */}
      <SectionTitle>운영이익 추이</SectionTitle>
      <YearChart months={y.months} />

      <Card className="space-y-1">
        <SummaryRow label="연간 매출" value={won(y.total.revenue)} />
        <SummaryRow label="연간 운영이익" value={won(y.total.operatingProfit)} strong />
        <SummaryRow
          label="평균 운영이익률"
          value={
            y.total.revenue > 0
              ? `${(y.total.operatingMargin * 100).toFixed(1)}%`
              : "—"
          }
        />
      </Card>
    </div>
  );
}

function NumberRow({ row, topBorder }: { row: NumRow; topBorder?: boolean }) {
  const tone = (v: number) => (row.signed && v < 0 ? "text-coral" : "text-ink");
  const edge = topBorder ? "border-t-2" : row.strong ? "border-t" : "";
  return (
    <tr>
      <th
        className={`sticky left-0 z-10 whitespace-nowrap border-line bg-card px-3 py-1.5 text-left ${edge} ${
          row.strong ? "font-bold text-ink" : "font-medium text-stone"
        }`}
      >
        {row.label}
      </th>
      {row.values.map((v, i) => (
        <td
          key={i}
          className={`whitespace-nowrap border-line px-2.5 py-1.5 ${edge} ${
            v === 0 ? "text-stone" : tone(v)
          } ${row.strong ? "font-bold" : ""}`}
        >
          {num(v)}
        </td>
      ))}
      <td
        className={`sticky right-0 z-10 whitespace-nowrap border-l border-line bg-cream px-3 py-1.5 font-bold ${edge} ${tone(
          row.total
        )}`}
      >
        {num(row.total)}
      </td>
    </tr>
  );
}

// 비율 보조행 — 위 금액 행에 딸린 작은 회색 줄
function SubRow({
  label,
  values,
  total,
  warn,
  warnTotal,
  divider,
}: {
  label: string;
  values: string[];
  total: string;
  warn?: boolean[];
  warnTotal?: boolean;
  divider?: boolean;
}) {
  const edge = divider ? "border-b-2 border-line" : "";
  return (
    <tr>
      <th
        className={`sticky left-0 z-10 whitespace-nowrap bg-card px-3 pb-2 pl-5 text-left text-[10px] font-normal text-stone ${edge}`}
      >
        {label}
      </th>
      {values.map((v, i) => (
        <td
          key={i}
          className={`whitespace-nowrap px-2.5 pb-2 text-[11px] ${edge} ${
            warn?.[i] ? "font-semibold text-coral" : "text-stone"
          }`}
        >
          {v}
        </td>
      ))}
      <td
        className={`sticky right-0 z-10 whitespace-nowrap border-l border-line bg-cream px-3 pb-2 text-[11px] font-semibold ${edge} ${
          warnTotal ? "text-coral" : "text-stone"
        }`}
      >
        {total}
      </td>
    </tr>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${strong ? "font-bold" : ""}`}>
      <span className="text-stone">{label}</span>
      <span className="tabular text-ink">{value}</span>
    </div>
  );
}
