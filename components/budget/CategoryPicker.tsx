"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { budgetsOfMonth, groupBudgetsByCategory } from "@/lib/compute";
import { currentYearMonth } from "@/lib/format";
import { inputCls } from "./ui";
import { UNGROUPED, type TxType } from "@/lib/types";

// 계정 과목이 33개라 단일 드롭다운으로는 찾기 어렵다. 카테고리를 먼저 고르고
// 그 안의 과목만 보여준다. 카테고리 나열 순서는 이번 달 적용 버전의 예산 순서를 따른다.
export default function CategoryPicker({
  type,
  value,
  onChange,
  extraOption,
}: {
  type: TxType;
  value: string;
  onChange: (categoryId: string) => void;
  extraOption?: { value: string; label: string };
}) {
  const { categories, categoryById, budgets, budgetVersions } = useData();

  const cats = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  // 예산 순서가 있는 카테고리 먼저, 나머지는 이름순, "미분류"는 맨 뒤.
  const groupNames = useMemo(() => {
    const ym = currentYearMonth();
    const ordered = groupBudgetsByCategory(
      budgetsOfMonth(budgets, budgetVersions, ym).filter((b) => b.categoryId !== null),
      categoryById
    ).map((g) => g.name);
    const present = new Set(cats.map((c) => c.groupName || UNGROUPED));
    const out = ordered.filter((n) => present.has(n));
    const rest = [...present]
      .filter((n) => !out.includes(n) && n !== UNGROUPED)
      .sort((a, b) => a.localeCompare(b));
    const tail = present.has(UNGROUPED) ? [UNGROUPED] : [];
    return [...out.filter((n) => n !== UNGROUPED), ...rest, ...tail];
  }, [budgets, budgetVersions, categoryById, cats]);

  const groupOf = (id: string) => categoryById(id)?.groupName || UNGROUPED;
  const [group, setGroup] = useState<string>(() => {
    if (value) return groupOf(value);
    return groupNames.length === 1 ? groupNames[0] : "";
  });

  const subjects = cats.filter((c) => (c.groupName || UNGROUPED) === group);

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        className={inputCls}
        value={group}
        onChange={(e) => {
          setGroup(e.target.value);
          onChange(""); // 카테고리를 바꾸면 과목 선택은 비운다
        }}
        aria-label="카테고리"
      >
        <option value="">카테고리</option>
        {groupNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <select
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="계정 과목"
      >
        <option value="">계정 과목</option>
        {extraOption && (
          <option value={extraOption.value}>{extraOption.label}</option>
        )}
        {subjects.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
