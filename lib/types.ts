// 배추가족 가계부 도메인 타입

export type Member = "chuchu" | "baejji";

export const MEMBERS: { id: Member; name: string; emoji: string }[] = [
  { id: "chuchu", name: "추추", emoji: "🧑" },
  { id: "baejji", name: "배찌", emoji: "👩" },
];

export function memberName(id: Member): string {
  return MEMBERS.find((m) => m.id === id)?.name ?? id;
}

export type TxType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: TxType;
  color: string; // hex
  icon?: string; // emoji
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number; // 1-31 (말일 보정)
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = 무기한
  isInstallment: boolean;
  installmentTotalMonths: number | null;
  installmentPaidMonths: number; // 납입 완료 개월수
  memo: string | null;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TxType;
  categoryId: string;
  memo: string | null;
  member: Member;
  source: "manual" | "auto";
  recurringId: string | null;
  isPaid: boolean;
}

export interface Budget {
  id: string;
  yearMonth: string; // YYYY-MM
  categoryId: string | null; // null = 전체 예산
  amount: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null; // YYYY-MM-DD
}

export interface DataSnapshot {
  categories: Category[];
  recurring: RecurringExpense[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}
