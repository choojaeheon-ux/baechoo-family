"use client";

import { useState } from "react";
import { Card } from "@/components/budget/ui";
import { BUDGET_RULES } from "@/lib/types";

export default function BudgetRules() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-bold text-ink">예산 규칙</span>
        <span className="text-stone">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5">
          {BUDGET_RULES.map((r) => (
            <li key={r} className="flex gap-2 text-[13px] leading-relaxed text-stone">
              <span className="text-leaf">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
