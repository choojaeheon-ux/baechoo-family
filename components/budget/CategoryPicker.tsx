"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { budgetsOfMonth, groupBudgetsByCategory } from "@/lib/compute";
import { currentYearMonth } from "@/lib/format";
import { inputCls } from "./ui";
import { UNGROUPED, type Category, type TxType } from "@/lib/types";

// 계정 과목이 33개라 단일 드롭다운으로는 찾기 어렵다. 카테고리를 먼저 고르고
// 그 안의 과목만 보여준다. 카테고리·과목 나열 순서는 둘 다 이번 달 적용 버전의
// 예산 순서를 따른다 — 예산 탭에서 정한 순서가 입력 화면에도 그대로 온다.
export default function CategoryPicker({
  type,
  value,
  onChange,
  extraOption,
  budgetedOnly = false,
}: {
  type: TxType;
  value: string;
  onChange: (categoryId: string) => void;
  extraOption?: { value: string; label: string };
  // 이번 달 적용 버전에 예산이 있는 과목만 노출한다(거래 입력 전용).
  // 예산 설정 폼은 예산 없는 과목에 새로 예산을 잡는 화면이라 켜면 안 된다.
  budgetedOnly?: boolean;
}) {
  const { categories, categoryById, budgets, budgetVersions } = useData();
  const ym = currentYearMonth();

  const cats = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  // 이번 달 적용 버전의 예산 행 — 과목 순서와 노출 대상의 근거다.
  // 같은 과목 행이 둘이면 앞의 것을 쓴다(budgetForCategory와 같은 규칙).
  const budgetedOrder = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const b of budgetsOfMonth(budgets, budgetVersions, ym)) {
      if (b.categoryId !== null && !m.has(b.categoryId)) {
        m.set(b.categoryId, b.sortOrder ?? null);
      }
    }
    return m;
  }, [budgets, budgetVersions, ym]);

  // 수입에는 예산 행이 아예 없으므로 필터를 걸면 목록이 비어 입력이 막힌다.
  const restrict = budgetedOnly && type === "expense";

  // 편집 중인 값은 예산이 없어도 남긴다 — 빼면 그 거래를 수정할 때 과목이 바뀐다.
  const visible = useMemo(
    () => cats.filter((c) => !restrict || budgetedOrder.has(c.id) || c.id === value),
    [cats, restrict, budgetedOrder, value]
  );

  const bySort = useMemo(() => {
    return (a: Category, b: Category) => {
      const ao = budgetedOrder.get(a.id) ?? null;
      const bo = budgetedOrder.get(b.id) ?? null;
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1;
      if (bo != null) return 1;
      return a.name.localeCompare(b.name);
    };
  }, [budgetedOrder]);

  // 예산 순서가 있는 카테고리 먼저, 나머지는 이름순, "미분류"는 맨 뒤.
  const groupNames = useMemo(() => {
    const ordered = groupBudgetsByCategory(
      budgetsOfMonth(budgets, budgetVersions, ym).filter((b) => b.categoryId !== null),
      categoryById
    ).map((g) => g.name);
    const present = new Set(visible.map((c) => c.groupName || UNGROUPED));
    const out = ordered.filter((n) => present.has(n));
    const rest = [...present]
      .filter((n) => !out.includes(n) && n !== UNGROUPED)
      .sort((a, b) => a.localeCompare(b));
    const tail = present.has(UNGROUPED) ? [UNGROUPED] : [];
    return [...out.filter((n) => n !== UNGROUPED), ...rest, ...tail];
  }, [budgets, budgetVersions, ym, categoryById, visible]);

  const groupOf = (id: string) => categoryById(id)?.groupName || UNGROUPED;
  const [group, setGroup] = useState<string>(() => {
    if (value) return groupOf(value);
    return groupNames.length === 1 ? groupNames[0] : "";
  });

  const subjects = visible
    .filter((c) => (c.groupName || UNGROUPED) === group)
    .sort(bySort);

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
