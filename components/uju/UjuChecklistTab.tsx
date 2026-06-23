"use client";

import { useState } from "react";
import type { UjuChecklist } from "@/lib/types";
import { SectionTitle } from "@/components/budget/ui";
import UjuChecklistList from "./UjuChecklistList";
import { UjuChecklistForm } from "./forms";

export default function UjuChecklistTab() {
  const [form, setForm] = useState<{ open: boolean; initial?: UjuChecklist }>({
    open: false,
  });

  return (
    <div>
      <SectionTitle
        right={
          <button
            onClick={() => setForm({ open: true })}
            className="text-xs font-bold text-leaf-dark"
          >
            + 항목
          </button>
        }
      >
        체크리스트
      </SectionTitle>

      <UjuChecklistList onEdit={(c) => setForm({ open: true, initial: c })} />

      {form.open && (
        <UjuChecklistForm
          key={form.initial?.id ?? "new"}
          open={form.open}
          onClose={() => setForm({ open: false })}
          initial={form.initial}
        />
      )}
    </div>
  );
}
