"use client";

import { won } from "@/lib/format";
import { groupTotal } from "@/lib/plan";
import { Card } from "@/components/budget/ui";
import type { PlanItem } from "@/lib/types";

export default function PlanSummary({ items }: { items: PlanItem[] }) {
  const income = groupTotal(items, "income");
  const spending = groupTotal(items, "spending");
  const saving = groupTotal(items, "saving", false);
  const conditional = groupTotal(items, "saving", true);
  const balance = income - spending - saving - conditional;

  const rows: { label: string; value: number }[] = [
    { label: "수입", value: income },
    { label: "월 지출", value: spending },
    { label: "저축·상환", value: saving },
    { label: "여유 시 집행", value: conditional },
  ];

  return (
    <Card>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-0.5 text-stone">{r.label}</td>
              <td className="py-0.5 text-right tabular-nums text-ink">
                {won(r.value)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <td className="pt-2 font-bold text-ink">잔액</td>
            <td
              className={`pt-2 text-right text-lg font-extrabold tabular-nums ${
                balance >= 0 ? "text-leaf-dark" : "text-coral"
              }`}
            >
              {won(balance)}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
