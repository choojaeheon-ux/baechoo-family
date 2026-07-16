"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { newId } from "@/lib/repo";
import { todayISO } from "@/lib/format";
import { CATEGORY_PALETTE } from "@/lib/eventCategoryPalette";
import type { EventCategory } from "@/lib/types";
import { Sheet, inputCls, PrimaryButton } from "@/components/budget/ui";

// 개별 카테고리 편집 행(이름 + 색 스와치 + 삭제)
function Row({ cat }: { cat: EventCategory }) {
  const { eventCategories, familyEvents, saveEventCategory, removeEventCategory, saveFamilyEvent } = useData();
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color);
  const [confirming, setConfirming] = useState(false);

  const usedCount = familyEvents.filter((e) => e.categoryId === cat.id).length;
  const others = eventCategories.filter((c) => c.id !== cat.id);
  const canDelete = others.length >= 1;

  async function save() {
    if (!name.trim()) return;
    await saveEventCategory({ ...cat, name: name.trim(), color });
  }

  async function del() {
    // 이 카테고리 일정을 첫 다른 카테고리로 재배정 후 삭제(고아 방지)
    const target = others[0];
    if (!target) return;
    for (const e of familyEvents.filter((x) => x.categoryId === cat.id)) {
      await saveFamilyEvent({ ...e, categoryId: target.id });
    }
    await removeEventCategory(cat.id);
  }

  return (
    <div className="rounded-xl border border-line p-2.5">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORY_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={async () => { setColor(c); await saveEventCategory({ ...cat, name: name.trim() || cat.name, color: c }); }}
            className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-leaf ring-offset-1" : ""}`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
      </div>
      {canDelete && !confirming && (
        <button type="button" onClick={() => setConfirming(true)} className="mt-2 text-xs text-coral">
          삭제
        </button>
      )}
      {canDelete && confirming && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-stone">
            {usedCount > 0
              ? `이 카테고리 일정 ${usedCount}개는 '${others[0].name}'로 옮겨져요`
              : "삭제할까요?"}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold text-stone">
              취소
            </button>
            <button type="button" onClick={del} className="flex-1 rounded-xl bg-coral py-2 text-sm font-bold text-white">
              삭제 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { eventCategories, saveEventCategory } = useData();

  async function add() {
    const used = eventCategories.map((c) => c.color);
    const color = CATEGORY_PALETTE.find((c) => !used.includes(c)) ?? CATEGORY_PALETTE[0];
    const maxSort = eventCategories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    await saveEventCategory({
      id: newId(),
      name: "새 카테고리",
      color,
      emoji: null,
      sortOrder: maxSort + 10,
      createdAt: todayISO(),
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="카테고리 관리">
      <div className="space-y-2">
        {[...eventCategories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
          <Row key={c.id} cat={c} />
        ))}
      </div>
      <div className="mt-3">
        <PrimaryButton onClick={add}>+ 새 카테고리</PrimaryButton>
      </div>
      <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm text-stone">
        닫기
      </button>
    </Sheet>
  );
}
