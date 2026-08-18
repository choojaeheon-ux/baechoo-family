"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { newId } from "@/lib/repo";
import { todayISO } from "@/lib/format";
import { CATEGORY_PALETTE } from "@/lib/categoryPalette";
import type { DailyTodoCategory } from "@/lib/types";
import { Sheet, inputCls, PrimaryButton } from "@/components/budget/ui";

function Row({ cat }: { cat: DailyTodoCategory }) {
  const {
    dailyTodoCategories,
    dailyTodos,
    saveDailyTodoCategory,
    removeDailyTodoCategory,
    saveDailyTodo,
  } = useData();
  const [name, setName] = useState(cat.name);
  const [confirming, setConfirming] = useState(false);

  const usedCount = dailyTodos.filter((t) => t.categoryId === cat.id).length;
  const others = dailyTodoCategories.filter((c) => c.id !== cat.id);
  const canDelete = others.length >= 1;

  async function saveName() {
    if (!name.trim()) return;
    await saveDailyTodoCategory({ ...cat, name: name.trim() });
  }

  // 이 카테고리 항목을 첫 다른 카테고리로 옮긴 뒤 지운다(고아 방지).
  async function del() {
    const target = others[0];
    if (!target) return;
    for (const t of dailyTodos.filter((x) => x.categoryId === cat.id)) {
      await saveDailyTodo({ ...t, categoryId: target.id });
    }
    await removeDailyTodoCategory(cat.id);
  }

  return (
    <div className="rounded-xl border border-line p-2.5">
      <div className="flex items-center gap-2">
        <span
          className="h-5 w-5 shrink-0 rounded-full"
          style={{ backgroundColor: cat.color }}
        />
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORY_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() =>
              saveDailyTodoCategory({ ...cat, name: name.trim() || cat.name, color: c })
            }
            className={`h-6 w-6 rounded-full ${
              cat.color === c ? "ring-2 ring-leaf ring-offset-1" : ""
            }`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
      </div>
      {canDelete && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2 text-xs text-coral"
        >
          삭제
        </button>
      )}
      {canDelete && confirming && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-stone">
            {usedCount > 0
              ? `이 카테고리 항목 ${usedCount}개는 '${others[0].name}'로 옮겨져요`
              : "삭제할까요?"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold text-stone"
            >
              취소
            </button>
            <button
              type="button"
              onClick={del}
              className="flex-1 rounded-xl bg-coral py-2 text-sm font-bold text-white"
            >
              삭제 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategorySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { dailyTodoCategories, saveDailyTodoCategory } = useData();

  async function add() {
    const used = dailyTodoCategories.map((c) => c.color);
    const color = CATEGORY_PALETTE.find((c) => !used.includes(c)) ?? CATEGORY_PALETTE[0];
    const maxSort = dailyTodoCategories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    await saveDailyTodoCategory({
      id: newId(),
      name: "새 카테고리",
      color,
      sortOrder: maxSort + 10,
      createdAt: todayISO(),
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="카테고리 관리">
      <div className="space-y-2">
        {[...dailyTodoCategories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => (
            <Row key={c.id} cat={c} />
          ))}
      </div>
      <div className="mt-3">
        <PrimaryButton onClick={add}>+ 새 카테고리</PrimaryButton>
      </div>
    </Sheet>
  );
}
