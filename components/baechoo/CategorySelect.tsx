"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import type { CategoryGroup } from "@/lib/types";
import { inputCls } from "@/components/budget/ui";
import { parseNames, joinNames } from "@/lib/mealNames";

// 저장된 옵션 칩 선택 + 새 항목 추가 + 편집(삭제). 사료/토핑/측정항목 공용.
// multiple이면 value를 ", "로 이은 여러 이름으로 다룬다 (단일 모드는 값을 쪼개지 않는다).
export default function CategorySelect({
  group,
  value,
  onChange,
  multiple = false,
}: {
  group: CategoryGroup;
  value: string;
  onChange: (name: string) => void;
  multiple?: boolean;
}) {
  const { baechooCategories, saveBaechooCategory, removeBaechooCategory } =
    useData();
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const opts = baechooCategories.filter((c) => c.group === group);
  const isMeasure = group === "measure";
  const names = opts.map((o) => o.name);
  // 다중은 쉼표로 나눈 전부, 단일은 값 하나
  const selected = multiple ? parseNames(value) : value ? [value] : [];
  // 선택값이 저장 목록에 없으면(구 기록 등) 임시 칩으로 표시
  const extra = selected.filter((n) => !names.includes(n));

  // 다중=토글(재탭 해제), 단일=교체
  function toggle(name: string) {
    if (!multiple) return onChange(name);
    onChange(
      joinNames(
        selected.includes(name)
          ? selected.filter((n) => n !== name)
          : [...selected, name]
      )
    );
  }

  async function addNew() {
    // 쉼표는 저장 문자열의 구분자라 이름에 들어가면 파싱이 깨진다
    const name = (multiple ? newName.replace(/,/g, " ") : newName).trim();
    if (!name) return;
    if (!names.includes(name)) {
      await saveBaechooCategory({
        id: "",
        group,
        name,
        unit: isMeasure ? newUnit.trim() || null : null,
      });
    }
    // 다중은 교체가 아니라 추가 선택
    onChange(multiple ? joinNames([...selected, name]) : name);
    setNewName("");
    setNewUnit("");
    setAdding(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {[...opts.map((o) => o.name), ...extra].map((name) => {
          const opt = opts.find((o) => o.name === name);
          const on = selected.includes(name);
          return (
            <span key={name} className="relative">
              <button
                type="button"
                onClick={() => toggle(name)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  on
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
                    // 지운 항목만 선택에서 뺀다
                    if (multiple) {
                      if (selected.includes(name))
                        onChange(joinNames(selected.filter((n) => n !== name)));
                    } else if (value === name) onChange("");
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
