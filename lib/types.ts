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
  createdAt: string; // ISO timestamp. 같은 날짜 안의 입력 순서용(신규 저장 시 repo가 채움)
}

export interface Budget {
  id: string;
  yearMonth: string | null; // null = 기본 예산(매달 적용), "YYYY-MM" = 그 달 오버라이드
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

/* ───────────── 가족 캘린더 ───────────── */

// 캘린더 카테고리 — 사용자 관리(이름 + 색). assignee 축을 대체.
export interface EventCategory {
  id: string;
  name: string;
  color: string; // hex
  emoji: string | null;
  sortOrder: number;
  createdAt: string; // YYYY-MM-DD
}

// 반복 규칙 — 시리즈 단일 레코드 + 예외(제외 회차) 목록 모델
export type EventRecurrence = "none" | "weekly" | "monthly";
export const EVENT_RECURRENCE_LABEL: Record<EventRecurrence, string> = {
  none: "없음",
  weekly: "매주",
  monthly: "매월",
};

export interface FamilyEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD (반복이면 첫 회차 시작일)
  endDate: string | null; // 연박 종료일, null = 당일
  time: string | null; // "HH:MM", null = 종일
  categoryId: string; // event_categories.id
  memo: string | null;
  recurrence: EventRecurrence;
  repeatInterval: number; // 1=매주/매월, 2=격주/격월…
  repeatUntil: string | null; // 반복 종료일, null = 무기한
  exceptions: string[]; // "이 회차만 삭제"된 회차 시작일들
  createdAt: string; // YYYY-MM-DD
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

// 건강 기록 — 병원·접종·약·영양제·증상·특이사항·양치·기타
export type HealthType =
  | "hospital"
  | "vaccine"
  | "medicine"
  | "supplement"
  | "symptom"
  | "note"
  | "dental"
  | "etc";
export const HEALTH_TYPE_LABEL: Record<HealthType, string> = {
  hospital: "병원",
  vaccine: "예방접종",
  medicine: "약",
  supplement: "영양제",
  symptom: "증상",
  note: "특이사항",
  dental: "양치",
  etc: "기타",
};
export const HEALTH_TYPES: HealthType[] = [
  "hospital",
  "vaccine",
  "medicine",
  "supplement",
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

// 신체검사 — 측정 / 관리
export type ExamType = "measure" | "care";
export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  measure: "측정",
  care: "관리",
};
// 관리 항목 빠른선택
export const CARE_ITEMS = ["빗질", "목욕", "발톱미용", "귀청소", "미용"] as const;

export interface BaechooExam {
  id: string;
  date: string; // YYYY-MM-DD
  examType: ExamType;
  measureName: string | null; // 측정 항목명 (체중·목둘레 등, 측정만)
  value: number | null; // 측정값 (측정만)
  unit: string | null; // 단위 (kg·cm 등, 측정만)
  weight: number | null; // (deprecated) 구버전 호환 — measureName/value로 대체
  content: string | null; // 관리 내용 (관리만)
  memo: string | null;
}

// 편집 가능한 옵션 리스트 (사료종류·토핑종류·측정항목 공용)
export type CategoryGroup = "food" | "topping" | "measure";
export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  food: "사료종류",
  topping: "토핑종류",
  measure: "측정항목",
};

export interface BaechooCategory {
  id: string;
  group: CategoryGroup;
  name: string;
  unit: string | null; // measure만 사용 (kg·cm 등)
}

// 건강 투두 — once(약·접종 D-day) / daily(양치 등 매일 체크)
export type HealthTodoKind = "once" | "daily";
export const HEALTH_TODO_KIND_LABEL: Record<HealthTodoKind, string> = {
  once: "예정일",
  daily: "매일",
};

export interface BaechooHealthTodo {
  id: string;
  title: string;
  kind: HealthTodoKind;
  dueDate: string | null; // once: 예정일 (YYYY-MM-DD)
  done: boolean; // once: 완료 여부
  completedAt: string | null; // once: 완료일
  doneDates: string[]; // daily: 체크된 날짜들
}

// 산책 기록 — GPS 경로 + 소요·거리 + 응가
export type StoolState =
  | "normal"
  | "oily"
  | "loose"
  | "diarrhea"
  | "watery"
  | "fail";
export const STOOL_STATE_LABEL: Record<StoolState, string> = {
  normal: "정상",
  oily: "기름기",
  loose: "묽음",
  diarrhea: "설사",
  watery: "물",
  fail: "응가실패",
};
export const STOOL_STATES: StoolState[] = [
  "normal",
  "oily",
  "loose",
  "diarrhea",
  "watery",
  "fail",
];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Stool {
  state: StoolState;
  time: string | null; // HH:MM
  lat: number | null;
  lng: number | null;
}

export interface BaechooWalk {
  id: string;
  date: string; // YYYY-MM-DD (startTime 파생)
  startTime: string | null; // ISO timestamp
  durationSec: number; // 소요 (타이머 합산)
  distanceM: number; // 거리 (haversine 합산)
  route: LatLng[]; // 추적 좌표 (수동입력은 빈 배열)
  stools: Stool[]; // 산책 중 응가들
  memo: string | null;
}

/* ───────────── 배추 예방접종 ───────────── */

// 예방접종 — 백신별 최근 접종일 하나. 다음 예정일·체크 여부는 lib/vaccine.ts에서 파생.
export interface BaechooVaccine {
  id: string;
  name: string;
  lastDone: string | null;  // 최근 접종일 (YYYY-MM-DD), null = 미접종
  memo: string | null;
  createdAt: string;        // YYYY-MM-DD
}

// 표준 백신 프리셋 ("표준 백신 추가" 버튼) — 배추 정기 백신 5종 (모두 연 1회)
export const STANDARD_VACCINES: string[] = [
  "켄넬코프백신",
  "코로나장염백신",
  "종합백신",
  "광견병백신",
  "신종인플루엔자백신",
];

/* ───────────── 우주 육아기록부 ───────────── */

// 기한(D-day) 있는 체크리스트 항목 — 예방접종·출산 준비물 등 (개별 평면 항목)
export interface UjuChecklist {
  id: string;
  title: string;
  dueDate: string; // 기한 (YYYY-MM-DD, 절대 날짜)
  done: boolean;
  completedAt: string | null; // 완료일
  memo: string | null;
  createdAt: string; // YYYY-MM-DD
}

// 월말 총자산 스냅샷 (현금+계좌+투자 잔액 합계) — 가족 P&L
export interface AssetSnapshot {
  id: string;
  yearMonth: string; // "YYYY-MM"
  totalAssets: number; // 현금+계좌+투자 잔액 합계
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
  baechooCategories: BaechooCategory[];
  baechooHealthTodos: BaechooHealthTodo[];
  baechooWalks: BaechooWalk[];
  ujuChecklists: UjuChecklist[];
  baechooVaccines: BaechooVaccine[];
  assetSnapshots: AssetSnapshot[];
  familyEvents: FamilyEvent[];
  eventCategories: EventCategory[];
  planItems: PlanItem[];
}

export type PnlClass =
  | "revenue"
  | "fixed"
  | "saving"
  | "variable"
  | "excluded";

// 손익분류 상수 (카테고리 id 기준 — 이름은 사용자가 바꿀 수 있어 불안정)
export const EXCLUDED_CAT_IDS = ["cat-card"];
export const FIXED_CAT_IDS = ["cat-housing", "cat-installment"];
export const SAVING_CAT_IDS = ["cat-saving"];

export interface PnlSummary {
  revenue: number;
  fixed: number;
  saving: number;
  grossProfit: number;     // revenue - fixed - saving
  variable: number;
  operatingProfit: number; // grossProfit - variable
  operatingMargin: number; // operatingProfit / revenue (revenue 0이면 0)
  bepAchieved: boolean;    // operatingProfit >= 0
  variableByHabit: Record<string, number>;
}

export interface WaterfallSegment {
  label: string;
  range: [number, number];
  value: number;
  kind: "revenue" | "deduct" | "profit";
}

/* ───────────── 가족 P&L — 예산 계획 ───────────── */

// 계획 항목의 구획 (손글씨 노트의 좌/우 블록)
export type PlanGroup = "income" | "spending" | "saving";

export const PLAN_GROUP_LABEL: Record<PlanGroup, string> = {
  income: "수입",
  spending: "월 지출",
  saving: "저축·상환",
};

// 손익분류 라벨 (계획 항목 편집 시트에서 선택지로 노출)
export const PNL_CLASS_LABEL: Record<Exclude<PnlClass, "excluded">, string> = {
  revenue: "매출",
  fixed: "고정비",
  saving: "선저축",
  variable: "변동비",
};

// 월 예산 계획 1항목.
// group은 화면 구획, pnlClass는 손익 집계 버킷 — 둘은 독립이다.
// (예: 학자금 상환은 group=saving이지만 pnlClass=fixed)
// 집행 여부: 시작월 <= 기준월 <= 종료월 (null은 무한대). 1회성은 시작월 === 종료월.
export interface PlanItem {
  id: string;
  group: PlanGroup;
  name: string;
  amount: number; // 월 금액
  pnlClass: Exclude<PnlClass, "excluded">;
  conditional: boolean; // ⊖ — 여유 있을 때 집행
  startYearMonth: string | null; // "YYYY-MM", null = 시작 제한 없음. 이 달부터 집행.
  endYearMonth: string | null; // "YYYY-MM", null = 무기한. 이 달까지 집행.
  targetTotal: number | null; // 부채 잔액·적립 목표액 (표시용)
  note: string | null;
  sortOrder: number;
}

// 예산 규칙 (손글씨 포스트잇)
export const BUDGET_RULES: string[] = [
  "금액은 넉넉하게 올려 잡는다",
  "현금·배찌 주식은 계획에서 잊는다",
  "첫만남 이용권·안양시 200만원 등 일회성 금액은 잊는다",
];
