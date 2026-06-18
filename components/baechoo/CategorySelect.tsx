"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import type { CategoryGroup } from "@/lib/types";
import { inputCls } from "@/components/budget/ui";

// 저장된 옵션 칩 선택 + 새 항목 추가 + 편집(삭제). 사료/토핑/측정항목 공용.
export default function CategorySelect({
  group,
  value,
  onChange,
}: {
  group: CategoryGroup;
  value: string;
  onChange: (name: string) => void;
}) {
  const { baechooCategories, saveBaechooCategory, removeBaechooCategory } =
    useData();
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const opts = baechooCategories.filter((c) => c.group === group);
  const isMeasure = group === "measure";
  // 현재 값이 저장 목록에 없으면(구 기록 등) 임시 칩으로 표시
  const names = opts.map((o) => o.name);
  const extra = value && !names.includes(value) ? [value] : [];

  async function addNew() {
    const name = newName.trim();
    if (!name) return;
    if (!names.includes(name)) {
      await saveBaechooCategory({
        id: "",
        group,
        name,
        unit: isMeasure ? newUnit.trim() || null : null,
      });
    }
    onChange(name);
    setNewName("");
    setNewUnit("");
    setAdding(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {[...opts.map((o) => o.name), ...extra].map((name) => {
          const opt = opts.find((o) => o.name === name);
          const selected = value === name;
          return (
            <span key={name} className="relative">
              <button
                type="button"
                onClick={() => onChange(name)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  selected
                    ? "border-leaf bg-leaf text-white"
                    : "border-line bg-cream text-stone"
                }`}
              >
                {name}
                {isMeasure && opt?.unit ? (
                  <span className="ml-1 opacity-70">{opt.unit}</span>
                ) : null}
              </button>
              {editMode && opt && (
                <button
                  type="button"
                  onClick={async () => {
                    await removeBaechooCategory(opt.id);
                    if (value === name) onChange("");
                  }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] text-white"
                >
                  ✕
                </button>
              )}
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-full border border-dashed border-leaf px-3 py-1.5 text-sm font-semibold text-leaf-dark"
        >
          + 추가
        </button>
        {opts.length > 0 && (
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className="rounded-full px-2 py-1.5 text-xs font-semibold text-stone"
          >
            {editMode ? "완료" : "편집"}
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex gap-1.5">
          <input
            className={inputCls + " flex-1"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={isMeasure ? "예: 목둘레" : "새 항목 이름"}
            autoFocus
          />
          {isMeasure && (
            <input
              className={inputCls + " w-20"}
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="단위"
            />
          )}
          <button
            type="button"
            onClick={addNew}
            className="shrink-0 rounded-xl bg-leaf px-4 text-sm font-bold text-white"
          >
            추가
          </button>
        </div>
      )}
    </div>
  );
}
