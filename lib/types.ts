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

// 결제수단 (카드·현금·계좌이체 등) — 직접 관리
export interface PaymentMethod {
  id: string;
  name: string;
  kind: "card" | "cash" | "account";
}

export const PAYMENT_KIND_LABEL: Record<PaymentMethod["kind"], string> = {
  card: "카드",
  cash: "현금",
  account: "계좌이체",
};

// 습관 태그 (줄일 수 있는 항목 횟수 집계용)
export const HABIT_TAGS = ["배달", "커피", "외식", "쇼핑", "택시", "구독"] as const;
export type HabitTag = (typeof HABIT_TAGS)[number];

// 고정지출 종류
export type RecurringKind = "fixed" | "subscription" | "installment";
export const RECURRING_KIND_LABEL: Record<RecurringKind, string> = {
  fixed: "고정지출",
  subscription: "구독서비스",
  installment: "할부·대출",
};

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number; // 1-31 (말일 보정)
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = 무기한
  kind: RecurringKind;
  paymentMethodId: string | null; // 결제 카드/수단
  installmentTotalMonths: number | null; // kind=installment일 때
  installmentPaidMonths: number; // 납입 완료 개월수
  memo: string | null;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TxType;
  categoryId: string;
  memo: string | null; // 내용
  member: Member;
  paymentMethodId: string | null; // 결제수단
  isSpecial: boolean; // 특수지출(비정기 큰 지출)
  habitTag: string | null; // 습관 태그
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

// 지역화폐 (온누리·경기지역화폐 등) — 선불 지갑, 매월 충전·이월 잔액
export interface LocalCurrency {
  id: string;
  name: string;
  balance: number; // 이월 포함 현재 잔액
  monthlyCharge: number; // 매월 충전금(기본값)
}

export interface DataSnapshot {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  recurring: RecurringExpense[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  localCurrencies: LocalCurrency[];
}
