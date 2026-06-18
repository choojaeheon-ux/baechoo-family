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
  localCurrencyId: string | null; // 지역화폐 충전으로 생성된 거래면 해당 지역화폐 id
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
  defaultCategoryId: string | null; // 충전 거래에 쓸 기본 카테고리
  defaultPaymentMethodId: string | null; // 충전 거래에 쓸 기본 결제수단
}

// 무지출 챌린지 보상 규칙 (이번 달 누적 무지출 N일 → 보상)
export interface RewardRule {
  id: string;
  days: number; // 달성 누적 무지출 일수
  name: string; // 보상 이름 (예: 배달 1회권)
}

// 발급된 쿠폰
export interface Coupon {
  id: string;
  ruleId: string | null;
  name: string;
  earnedYearMonth: string; // YYYY-MM (발급 월)
  used: boolean;
}

// 52주 투두 — 담당자(추추·배찌·함께)
export type TodoAssignee = "chuchu" | "baejji" | "together";
export const TODO_ASSIGNEES: { id: TodoAssignee; name: string; emoji: string }[] = [
  { id: "chuchu", name: "추추", emoji: "🧑" },
  { id: "baejji", name: "배찌", emoji: "👩" },
  { id: "together", name: "함께", emoji: "👫" },
];
export function todoAssigneeName(id: TodoAssignee): string {
  return TODO_ASSIGNEES.find((a) => a.id === id)?.name ?? id;
}

// 할 일 상태 — 진행/완료/취소 (미룸은 상태가 아니라 주 재지정 액션)
export type TodoStatus = "pending" | "done" | "cancelled";
export const TODO_STATUS_LABEL: Record<TodoStatus, string> = {
  pending: "진행",
  done: "완료",
  cancelled: "취소",
};

// 52주 투두 1건 — 직접 선택한 주(weekNum)에 배치
export interface WeekTodo {
  id: string;
  year: number;
  weekNum: number | null; // 1-52, null = 날짜 미정
  title: string; // 할 일 내용
  assignee: TodoAssignee;
  dueDate: string | null; // 언제까지 (YYYY-MM-DD)
  memo: string | null; // 요청사항 메모
  status: TodoStatus;
  deferCount: number; // 미룸 횟수
  createdAt: string; // YYYY-MM-DD
  completedAt: string | null;
}

/* ───────────── 배추 생활기록부 ───────────── */

// 식사/간식 기록
export type MealType = "meal" | "snack";
export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  meal: "식사",
  snack: "간식",
};

export interface BaechooMeal {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  time: string | null; // HH:MM
  content: string; // 식사=사료종류, 간식=종류
  topping: string | null; // 토핑종류 (식사만)
  amount: string | null; // 실제로 먹은 양 (자유 텍스트)
  memo: string | null;
}

// 건강 기록 — 병원·접종·약·증상·특이사항·양치·기타
export type HealthType =
  | "hospital"
  | "vaccine"
  | "medicine"
  | "symptom"
  | "note"
  | "dental"
  | "etc";
export const HEALTH_TYPE_LABEL: Record<HealthType, string> = {
  hospital: "병원",
  vaccine: "예방접종",
  medicine: "약",
  symptom: "증상",
  note: "특이사항",
  dental: "양치",
  etc: "기타",
};
export const HEALTH_TYPES: HealthType[] = [
  "hospital",
  "vaccine",
  "medicine",
  "symptom",
  "note",
  "dental",
  "etc",
];
// 양치 방법 빠른선택
export const DENTAL_METHODS = ["칫솔질", "양치껌"] as const;

export interface BaechooHealth {
  id: string;
  date: string; // YYYY-MM-DD
  healthType: HealthType;
  title: string; // 내용 (증상·특이사항·양치 방법·검진명 등)
  nextDate: string | null; // 다음 예정일 (재방문·다음 접종)
  memo: string | null;
}

// 신체검사 — 체중측정 / 관리
export type ExamType = "measure" | "care";
export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  measure: "체중측정",
  care: "관리",
};
// 관리 항목 빠른선택
export const CARE_ITEMS = ["빗질", "목욕", "발톱미용", "귀청소", "미용"] as const;

export interface BaechooExam {
  id: string;
  date: string; // YYYY-MM-DD
  examType: ExamType;
  weight: number | null; // kg (체중측정만)
  content: string | null; // 관리 내용 (관리만)
  memo: string | null;
}

export interface DataSnapshot {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  recurring: RecurringExpense[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  localCurrencies: LocalCurrency[];
  rewardRules: RewardRule[];
  coupons: Coupon[];
  weekTodos: WeekTodo[];
  baechooMeals: BaechooMeal[];
  baechooHealth: BaechooHealth[];
  baechooExams: BaechooExam[];
}
