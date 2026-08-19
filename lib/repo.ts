// 데이터 저장소 — Supabase 키가 있으면 클라우드, 없으면 localStorage
import { getSupabase, hasSupabase } from "./supabase";
import {
  SEED_CATEGORIES,
  SEED_PAYMENT_METHODS,
  SEED_BAECHOO_CATEGORIES,
  SEED_PLAN_ITEMS,
  SEED_DAILY_TODO_CATEGORIES,
  SEED_DAILY_TODO_SETTINGS,
} from "./seed";
import type {
  AssetSnapshot,
  Budget,
  BudgetVersion,
  Category,
  Coupon,
  DailyTodo,
  DailyTodoCategory,
  DailyTodoSettings,
  DataSnapshot,
  Goal,
  LocalCurrency,
  PaymentMethod,
  PlanGroup,
  PlanItem,
  RecurringExpense,
  RecurringKind,
  RewardRule,
  Transaction,
  TodoAssignee,
  TodoStatus,
  WeekTodo,
  BaechooMeal,
  BaechooHealth,
  BaechooExam,
  BaechooCategory,
  BaechooHealthTodo,
  BaechooWalk,
  UjuChecklist,
  BaechooVaccine,
  LatLng,
  Stool,
  MealType,
  HealthType,
  ExamType,
  CategoryGroup,
  HealthTodoKind,
} from "./types";
import { FIRST_BUDGET_MONTH } from "./types";

const LS_KEY = "baechoo-budget-v1";

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 구버전 localStorage 거래 승격 — createdAt 없으면 거래일 자정(정렬에서 undefined 방지), merchant 없으면 null
function normalizeTxn(x: Transaction): Transaction {
  return {
    ...x,
    createdAt: x.createdAt || `${x.date}T00:00:00.000Z`,
    merchant: x.merchant ?? null,
  };
}

// 구버전 localStorage 계정과목 승격 — costType·groupName 없으면 미지정(null)
function normalizeCategory(x: Category): Category {
  return { ...x, costType: x.costType ?? null, groupName: x.groupName ?? null };
}

// 구버전 localStorage 예산 승격 — sortOrder 키 자체가 없는 행은 미지정(null)으로
// (undefined로 두면 groupBudgetsByCategory 등의 `!== null` 비교를 "순서 있음"으로 통과한다)
function normalizeBudget(x: Budget): Budget {
  return { ...x, sortOrder: x.sortOrder ?? null };
}

// 구버전 localStorage 측정 기록(weight만 있음)을 measureName/value/unit로 승격
function normalizeExam(x: BaechooExam): BaechooExam {
  if (x.examType === "measure" && x.measureName == null && x.weight != null) {
    return { ...x, measureName: "체중", value: x.weight, unit: "kg" };
  }
  return x;
}

// 구버전 localStorage 접종 기록(doses 차수 배열)을 최근 접종일 하나로 승격
function normalizeVaccine(
  x: BaechooVaccine & { doses?: { n: number; date: string }[] }
): BaechooVaccine {
  const lastDone =
    x.lastDone ??
    (Array.isArray(x.doses) && x.doses.length > 0
      ? x.doses.reduce((a, b) => (b.date > a.date ? b : a)).date
      : null);
  return {
    id: x.id,
    name: x.name,
    lastDone,
    memo: x.memo ?? null,
    createdAt: x.createdAt,
  };
}

// localStorage에는 마이그레이션이 닿지 않는다 — 버전이 하나도 없으면
// v1을 만들어 기존 예산을 전부 붙인다(클라우드 0025와 같은 결과).
function normalizeBudgetVersions(
  versions: BudgetVersion[],
  budgets: Budget[]
): { versions: BudgetVersion[]; budgets: Budget[] } {
  if (versions.length > 0) return { versions, budgets };
  const v1: BudgetVersion = {
    id: "bv-1",
    name: "v1",
    startMonth: FIRST_BUDGET_MONTH,
    memo: null,
    createdAt: "",
  };
  return {
    versions: [v1],
    budgets: budgets.map((b) => (b.versionId ? b : { ...b, versionId: v1.id })),
  };
}

/* ───────────── localStorage 어댑터 ───────────── */

function lsRead(): DataSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) {
      const seeded: DataSnapshot = {
        ...emptySnapshot(),
        categories: SEED_CATEGORIES,
        paymentMethods: SEED_PAYMENT_METHODS,
        baechooCategories: SEED_BAECHOO_CATEGORIES,
        planItems: SEED_PLAN_ITEMS,
        budgetVersions: [],
        dailyTodos: [],
        dailyTodoCategories: SEED_DAILY_TODO_CATEGORIES,
        dailyTodoSettings: SEED_DAILY_TODO_SETTINGS,
      };
      window.localStorage.setItem(LS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<DataSnapshot>;
    const budgetsAndVersions = normalizeBudgetVersions(
      parsed.budgetVersions ?? [],
      (parsed.budgets ?? []).map(normalizeBudget)
    );
    return {
      categories: (parsed.categories ?? []).map(normalizeCategory),
      paymentMethods: parsed.paymentMethods ?? SEED_PAYMENT_METHODS,
      recurring: parsed.recurring ?? [],
      transactions: (parsed.transactions ?? []).map(normalizeTxn),
      budgets: budgetsAndVersions.budgets,
      budgetVersions: budgetsAndVersions.versions,
      goals: parsed.goals ?? [],
      localCurrencies: parsed.localCurrencies ?? [],
      rewardRules: parsed.rewardRules ?? [],
      coupons: parsed.coupons ?? [],
      weekTodos: parsed.weekTodos ?? [],
      baechooMeals: parsed.baechooMeals ?? [],
      baechooHealth: parsed.baechooHealth ?? [],
      baechooExams: (parsed.baechooExams ?? []).map(normalizeExam),
      baechooCategories: parsed.baechooCategories ?? SEED_BAECHOO_CATEGORIES,
      baechooHealthTodos: parsed.baechooHealthTodos ?? [],
      baechooWalks: parsed.baechooWalks ?? [],
      ujuChecklists: parsed.ujuChecklists ?? [],
      baechooVaccines: (parsed.baechooVaccines ?? []).map(normalizeVaccine),
      assetSnapshots: parsed.assetSnapshots ?? [],
      planItems: parsed.planItems ?? SEED_PLAN_ITEMS,
      dailyTodos: parsed.dailyTodos ?? [],
      dailyTodoCategories: parsed.dailyTodoCategories ?? SEED_DAILY_TODO_CATEGORIES,
      dailyTodoSettings: parsed.dailyTodoSettings ?? SEED_DAILY_TODO_SETTINGS,
    };
  } catch {
    return emptySnapshot();
  }
}

function lsWrite(snap: DataSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(snap));
}

function emptySnapshot(): DataSnapshot {
  return {
    categories: [],
    paymentMethods: [],
    recurring: [],
    transactions: [],
    budgets: [],
    budgetVersions: [],
    goals: [],
    localCurrencies: [],
    rewardRules: [],
    coupons: [],
    weekTodos: [],
    baechooMeals: [],
    baechooHealth: [],
    baechooExams: [],
    baechooCategories: [],
    baechooHealthTodos: [],
    baechooWalks: [],
    ujuChecklists: [],
    baechooVaccines: [],
    assetSnapshots: [],
    planItems: [],
    dailyTodos: [],
    dailyTodoCategories: [],
    dailyTodoSettings: SEED_DAILY_TODO_SETTINGS,
  };
}

function lsUpsert<T extends { id: string }>(key: keyof DataSnapshot, row: T): T {
  const snap = lsRead();
  const arr = snap[key] as unknown as T[];
  const idx = arr.findIndex((r) => r.id === row.id);
  if (idx >= 0) arr[idx] = row;
  else arr.push(row);
  lsWrite(snap);
  return row;
}

function lsDelete(key: keyof DataSnapshot, id: string) {
  const snap = lsRead();
  const arr = snap[key] as unknown as { id: string }[];
  snap[key] = arr.filter((r) => r.id !== id) as never;
  lsWrite(snap);
}

/* ───────────── Supabase 매퍼 ───────────── */

const toCat = (r: Record<string, unknown>): Category => ({
  id: r.id as string,
  name: r.name as string,
  type: r.type as Category["type"],
  groupName: (r.group_name as string) ?? null,
  costType: (r.cost_type as Category["costType"]) ?? null,
  color: r.color as string,
  icon: (r.icon as string) ?? undefined,
});
const fromCat = (c: Category) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  group_name: c.groupName ?? null,
  cost_type: c.costType ?? null,
  color: c.color,
  icon: c.icon ?? null,
});

const toPm = (r: Record<string, unknown>): PaymentMethod => ({
  id: r.id as string,
  name: r.name as string,
  kind: r.kind as PaymentMethod["kind"],
});
const fromPm = (p: PaymentMethod) => ({ id: p.id, name: p.name, kind: p.kind });

const toRec = (r: Record<string, unknown>): RecurringExpense => ({
  id: r.id as string,
  name: r.name as string,
  amount: Number(r.amount),
  categoryId: r.category_id as string,
  dayOfMonth: Number(r.day_of_month),
  startDate: r.start_date as string,
  endDate: (r.end_date as string) ?? null,
  kind: ((r.kind as RecurringKind) ??
    (r.is_installment ? "installment" : "fixed")) as RecurringKind,
  paymentMethodId: (r.payment_method_id as string) ?? null,
  installmentTotalMonths: r.installment_total_months
    ? Number(r.installment_total_months)
    : null,
  installmentPaidMonths: Number(r.installment_paid_months ?? 0),
  memo: (r.memo as string) ?? null,
});
const fromRec = (x: RecurringExpense) => ({
  id: x.id,
  name: x.name,
  amount: x.amount,
  category_id: x.categoryId,
  day_of_month: x.dayOfMonth,
  start_date: x.startDate,
  end_date: x.endDate,
  kind: x.kind,
  is_installment: x.kind === "installment",
  payment_method_id: x.paymentMethodId,
  installment_total_months: x.installmentTotalMonths,
  installment_paid_months: x.installmentPaidMonths,
  memo: x.memo,
});

const toTxn = (r: Record<string, unknown>): Transaction => ({
  id: r.id as string,
  date: r.date as string,
  amount: Number(r.amount),
  type: r.type as Transaction["type"],
  categoryId: r.category_id as string,
  merchant: (r.merchant as string) ?? null,
  memo: (r.memo as string) ?? null,
  member: r.member as Transaction["member"],
  paymentMethodId: (r.payment_method_id as string) ?? null,
  isSpecial: Boolean(r.is_special),
  habitTag: (r.habit_tag as string) ?? null,
  source: r.source as Transaction["source"],
  recurringId: (r.recurring_id as string) ?? null,
  localCurrencyId: (r.local_currency_id as string) ?? null,
  isPaid: Boolean(r.is_paid),
  createdAt: (r.created_at as string) ?? "",
});
const fromTxn = (x: Transaction) => ({
  id: x.id,
  date: x.date,
  amount: x.amount,
  type: x.type,
  category_id: x.categoryId,
  merchant: x.merchant,
  memo: x.memo,
  member: x.member,
  payment_method_id: x.paymentMethodId,
  is_special: x.isSpecial,
  habit_tag: x.habitTag,
  source: x.source,
  recurring_id: x.recurringId,
  local_currency_id: x.localCurrencyId,
  is_paid: x.isPaid,
  created_at: x.createdAt || null,
});

const toBudget = (r: Record<string, unknown>): Budget => ({
  id: r.id as string,
  yearMonth: (r.year_month as string) ?? null,
  categoryId: (r.category_id as string) ?? null,
  amount: Number(r.amount),
  versionId: (r.version_id as string) ?? null,
  sortOrder: r.sort_order === null || r.sort_order === undefined ? null : Number(r.sort_order),
});
const fromBudget = (x: Budget) => ({
  id: x.id,
  year_month: x.yearMonth,
  category_id: x.categoryId,
  amount: x.amount,
  version_id: x.versionId,
  sort_order: x.sortOrder,
});

const toBudgetVersion = (r: Record<string, unknown>): BudgetVersion => ({
  id: r.id as string,
  name: r.name as string,
  startMonth: r.start_month as string,
  memo: (r.memo as string) ?? null,
  createdAt: (r.created_at as string) ?? "",
});
const fromBudgetVersion = (x: BudgetVersion) => ({
  id: x.id,
  name: x.name,
  start_month: x.startMonth,
  memo: x.memo,
  created_at: x.createdAt || null,
});

const toLc = (r: Record<string, unknown>): LocalCurrency => ({
  id: r.id as string,
  name: r.name as string,
  balance: Number(r.balance ?? 0),
  monthlyCharge: Number(r.monthly_charge ?? 0),
  defaultCategoryId: (r.default_category_id as string) ?? null,
  defaultPaymentMethodId: (r.default_payment_method_id as string) ?? null,
});
const fromLc = (x: LocalCurrency) => ({
  id: x.id,
  name: x.name,
  balance: x.balance,
  monthly_charge: x.monthlyCharge,
  default_category_id: x.defaultCategoryId,
  default_payment_method_id: x.defaultPaymentMethodId,
});

const toRule = (r: Record<string, unknown>): RewardRule => ({
  id: r.id as string,
  days: Number(r.days),
  name: r.name as string,
});
const fromRule = (x: RewardRule) => ({ id: x.id, days: x.days, name: x.name });

const toCoupon = (r: Record<string, unknown>): Coupon => ({
  id: r.id as string,
  ruleId: (r.rule_id as string) ?? null,
  name: r.name as string,
  earnedYearMonth: r.earned_year_month as string,
  used: Boolean(r.used),
});
const fromCoupon = (x: Coupon) => ({
  id: x.id,
  rule_id: x.ruleId,
  name: x.name,
  earned_year_month: x.earnedYearMonth,
  used: x.used,
});

const toAssetSnapshot = (r: Record<string, unknown>): AssetSnapshot => ({
  id: r.id as string,
  yearMonth: r.year_month as string,
  totalAssets: Number(r.total_assets ?? 0),
});
const fromAssetSnapshot = (x: AssetSnapshot) => ({
  id: x.id,
  year_month: x.yearMonth,
  total_assets: x.totalAssets,
});

const toGoal = (r: Record<string, unknown>): Goal => ({
  id: r.id as string,
  name: r.name as string,
  targetAmount: Number(r.target_amount),
  currentAmount: Number(r.current_amount ?? 0),
  deadline: (r.deadline as string) ?? null,
});
const fromGoal = (x: Goal) => ({
  id: x.id,
  name: x.name,
  target_amount: x.targetAmount,
  current_amount: x.currentAmount,
  deadline: x.deadline,
});

const toWeekTodo = (r: Record<string, unknown>): WeekTodo => ({
  id: r.id as string,
  year: Number(r.year),
  weekNum: r.week_num == null ? null : Number(r.week_num),
  title: r.title as string,
  assignee: (r.assignee as TodoAssignee) ?? "together",
  dueDate: (r.due_date as string) ?? null,
  memo: (r.memo as string) ?? null,
  status: (r.status as TodoStatus) ?? "pending",
  deferCount: Number(r.defer_count ?? 0),
  createdAt: (r.created_at as string) ?? "",
  completedAt: (r.completed_at as string) ?? null,
});
const fromWeekTodo = (x: WeekTodo) => ({
  id: x.id,
  year: x.year,
  week_num: x.weekNum,
  title: x.title,
  assignee: x.assignee,
  due_date: x.dueDate,
  memo: x.memo,
  status: x.status,
  defer_count: x.deferCount,
  created_at: x.createdAt || null,
  completed_at: x.completedAt,
});

// 배추 — 식사/간식
const toMeal = (r: Record<string, unknown>): BaechooMeal => ({
  id: r.id as string,
  date: r.date as string,
  mealType: (r.meal_type as MealType) ?? "meal",
  time: (r.time as string) ?? null,
  content: (r.content as string) ?? "",
  topping: (r.topping as string) ?? null,
  amount: (r.amount as string) ?? null,
  memo: (r.memo as string) ?? null,
});
const fromMeal = (x: BaechooMeal) => ({
  id: x.id,
  date: x.date,
  meal_type: x.mealType,
  time: x.time,
  content: x.content,
  topping: x.topping,
  amount: x.amount,
  memo: x.memo,
});

// 배추 — 건강
const toHealth = (r: Record<string, unknown>): BaechooHealth => ({
  id: r.id as string,
  date: r.date as string,
  healthType: (r.health_type as HealthType) ?? "etc",
  title: (r.title as string) ?? "",
  nextDate: (r.next_date as string) ?? null,
  memo: (r.memo as string) ?? null,
});
const fromHealth = (x: BaechooHealth) => ({
  id: x.id,
  date: x.date,
  health_type: x.healthType,
  title: x.title,
  next_date: x.nextDate,
  memo: x.memo,
});

// 배추 — 신체검사 (체중→측정항목 일반화, 구버전 weight 호환)
const toExam = (r: Record<string, unknown>): BaechooExam => {
  const weight = r.weight == null ? null : Number(r.weight);
  // measure_name 없는 구버전 행은 weight를 체중 측정으로 승격
  const measureName =
    (r.measure_name as string) ?? (weight != null ? "체중" : null);
  const value = r.value == null ? weight : Number(r.value);
  const unit = (r.unit as string) ?? (weight != null ? "kg" : null);
  return {
    id: r.id as string,
    date: r.date as string,
    examType: (r.exam_type as ExamType) ?? "measure",
    measureName,
    value,
    unit,
    weight,
    content: (r.content as string) ?? null,
    memo: (r.memo as string) ?? null,
  };
};
const fromExam = (x: BaechooExam) => ({
  id: x.id,
  date: x.date,
  exam_type: x.examType,
  measure_name: x.measureName,
  value: x.value,
  unit: x.unit,
  weight: x.weight,
  content: x.content,
  memo: x.memo,
});

// 배추 — 편집 카테고리 (사료·토핑·측정항목)
const toBCat = (r: Record<string, unknown>): BaechooCategory => ({
  id: r.id as string,
  group: r.group as CategoryGroup,
  name: r.name as string,
  unit: (r.unit as string) ?? null,
});
const fromBCat = (x: BaechooCategory) => ({
  id: x.id,
  group: x.group,
  name: x.name,
  unit: x.unit,
});

// 배추 — 건강 투두
const toHealthTodo = (r: Record<string, unknown>): BaechooHealthTodo => ({
  id: r.id as string,
  title: r.title as string,
  kind: (r.kind as HealthTodoKind) ?? "once",
  dueDate: (r.due_date as string) ?? null,
  done: Boolean(r.done),
  completedAt: (r.completed_at as string) ?? null,
  doneDates: Array.isArray(r.done_dates) ? (r.done_dates as string[]) : [],
});
const fromHealthTodo = (x: BaechooHealthTodo) => ({
  id: x.id,
  title: x.title,
  kind: x.kind,
  due_date: x.dueDate,
  done: x.done,
  completed_at: x.completedAt,
  done_dates: x.doneDates,
});

// 배추 — 산책 (route·stools는 jsonb 배열)
const toWalk = (r: Record<string, unknown>): BaechooWalk => ({
  id: r.id as string,
  date: r.date as string,
  startTime: (r.start_time as string) ?? null,
  durationSec: Number(r.duration_sec ?? 0),
  distanceM: Number(r.distance_m ?? 0),
  route: Array.isArray(r.route) ? (r.route as LatLng[]) : [],
  stools: Array.isArray(r.stools) ? (r.stools as Stool[]) : [],
  memo: (r.memo as string) ?? null,
});
const fromWalk = (x: BaechooWalk) => ({
  id: x.id,
  date: x.date,
  start_time: x.startTime,
  duration_sec: x.durationSec,
  distance_m: x.distanceM,
  route: x.route,
  stools: x.stools,
  memo: x.memo,
});

// 우주 — 체크리스트 (기한 D-day)
const toUjuChecklist = (r: Record<string, unknown>): UjuChecklist => ({
  id: r.id as string,
  title: (r.title as string) ?? "",
  dueDate: (r.due_date as string) ?? "",
  done: Boolean(r.done),
  completedAt: (r.completed_at as string) ?? null,
  memo: (r.memo as string) ?? null,
  createdAt: (r.created_at as string) ?? "",
});
const fromUjuChecklist = (x: UjuChecklist) => ({
  id: x.id,
  title: x.title,
  due_date: x.dueDate,
  done: x.done,
  completed_at: x.completedAt,
  memo: x.memo,
  created_at: x.createdAt || null,
});

// 배추 — 예방접종 (최근 접종일 하나. 다음 예정일은 파생)
const toVaccine = (r: Record<string, unknown>): BaechooVaccine => ({
  id: r.id as string,
  name: (r.name as string) ?? "",
  lastDone: (r.last_done as string) ?? null,
  memo: (r.memo as string) ?? null,
  createdAt: (r.created_at as string) ?? "",
});
const fromVaccine = (x: BaechooVaccine) => ({
  id: x.id,
  name: x.name,
  last_done: x.lastDone,
  memo: x.memo,
  created_at: x.createdAt || null,
});

// 예산 계획 항목
const toPlanItem = (r: Record<string, unknown>): PlanItem => ({
  id: r.id as string,
  group: (r.group as PlanGroup) ?? "spending",
  name: (r.name as string) ?? "",
  amount: Number(r.amount ?? 0),
  pnlClass: (r.pnl_class as PlanItem["pnlClass"]) ?? "variable",
  conditional: Boolean(r.conditional),
  startYearMonth: (r.start_year_month as string) ?? null,
  endYearMonth: (r.end_year_month as string) ?? null,
  targetTotal: r.target_total == null ? null : Number(r.target_total),
  note: (r.note as string) ?? null,
  sortOrder: Number(r.sort_order ?? 0),
});
const fromPlanItem = (x: PlanItem) => ({
  id: x.id,
  group: x.group,
  name: x.name,
  amount: x.amount,
  pnl_class: x.pnlClass,
  conditional: x.conditional,
  start_year_month: x.startYearMonth,
  end_year_month: x.endYearMonth,
  target_total: x.targetTotal,
  note: x.note,
  sort_order: x.sortOrder,
});

// 데일리 투두 — 카테고리
const toDailyTodoCategory = (r: Record<string, unknown>): DailyTodoCategory => ({
  id: r.id as string,
  name: r.name as string,
  color: r.color as string,
  sortOrder: (r.sort_order as number) ?? 0,
  createdAt: (r.created_at as string) ?? "",
});
const fromDailyTodoCategory = (x: DailyTodoCategory) => ({
  id: x.id,
  name: x.name,
  color: x.color,
  sort_order: x.sortOrder,
  created_at: x.createdAt || null,
});

// 데일리 투두 — 항목
const toDailyTodo = (r: Record<string, unknown>): DailyTodo => ({
  id: r.id as string,
  title: r.title as string,
  categoryId: r.category_id as string,
  startDate: r.start_date as string,
  endDate: (r.end_date as string) ?? null,
  onceDate: (r.once_date as string) ?? null,
  doneDates: Array.isArray(r.done_dates) ? (r.done_dates as string[]) : [],
  sortOrder: (r.sort_order as number) ?? 0,
  createdAt: (r.created_at as string) ?? "",
});
const fromDailyTodo = (x: DailyTodo) => ({
  id: x.id,
  title: x.title,
  category_id: x.categoryId,
  start_date: x.startDate,
  end_date: x.endDate,
  once_date: x.onceDate,
  done_dates: x.doneDates,
  sort_order: x.sortOrder,
  created_at: x.createdAt || null,
});

/* ───────────── 공개 API ───────────── */

export async function loadAll(): Promise<DataSnapshot> {
  if (!hasSupabase) return lsRead();
  const sb = getSupabase()!;
  const [
    cats,
    pms,
    recs,
    txns,
    buds,
    bvs,
    goals,
    lcs,
    rules,
    coups,
    wtodos,
    meals,
    healths,
    exams,
    bcats,
    htodos,
    walks,
    ujuChecks,
    vaccines,
    assetSnaps,
    plans,
    dtcats,
    dtodos,
    dtset,
  ] = await Promise.all([
    sb.from("categories").select("*"),
    sb.from("payment_methods").select("*"),
    sb.from("recurring_expenses").select("*"),
    sb.from("transactions").select("*"),
    sb.from("budgets").select("*"),
    sb.from("budget_versions").select("*"),
    sb.from("goals").select("*"),
    sb.from("local_currencies").select("*"),
    sb.from("reward_rules").select("*"),
    sb.from("coupons").select("*"),
    sb.from("week_todos").select("*"),
    sb.from("baechoo_meals").select("*").is("deleted_at", null),
    sb.from("baechoo_health").select("*").is("deleted_at", null),
    sb.from("baechoo_exams").select("*").is("deleted_at", null),
    sb.from("baechoo_categories").select("*"),
    sb.from("baechoo_health_todos").select("*").is("deleted_at", null),
    sb.from("baechoo_walks").select("*").is("deleted_at", null),
    sb.from("uju_checklists").select("*").is("deleted_at", null),
    sb.from("baechoo_vaccines").select("*").is("deleted_at", null),
    sb.from("asset_snapshots").select("*"),
    sb.from("plan_items").select("*"),
    sb.from("daily_todo_categories").select("*"),
    sb.from("daily_todos").select("*"),
    sb.from("daily_todo_settings").select("*"),
  ]);
  let categories = (cats.data ?? []).map(toCat);
  if (categories.length === 0) {
    await sb.from("categories").insert(SEED_CATEGORIES.map(fromCat));
    categories = SEED_CATEGORIES;
  }
  let paymentMethods = (pms.data ?? []).map(toPm);
  if (paymentMethods.length === 0) {
    await sb.from("payment_methods").insert(SEED_PAYMENT_METHODS.map(fromPm));
    paymentMethods = SEED_PAYMENT_METHODS;
  }
  let baechooCategories = (bcats.data ?? []).map(toBCat);
  if (baechooCategories.length === 0) {
    await sb
      .from("baechoo_categories")
      .insert(SEED_BAECHOO_CATEGORIES.map(fromBCat));
    baechooCategories = SEED_BAECHOO_CATEGORIES;
  }
  let planItems = (plans.data ?? []).map(toPlanItem);
  if (planItems.length === 0) {
    await sb.from("plan_items").insert(SEED_PLAN_ITEMS.map(fromPlanItem));
    planItems = SEED_PLAN_ITEMS;
  }
  // daily_todo*: 에러 없이 0행이면 다른 시드와 같은 패턴으로 기본값을 넣는다.
  // 에러(0027 마이그레이션 미적용 등)면 시드를 넣지 않는다 — supabase-js는 PostgREST
  // 에러에 reject하지 않고 { data: null, error }를 주므로 `?? []`가 "0행"과 구별되지
  // 않는다. 그대로 두면 시드 insert도 같은 이유로 실패해 버려지는데 화면엔 멀쩡한
  // 기본 카테고리가 그려지고, 이후 쓰기는 전부 조용히 사라진다. 원인은 콘솔에 남긴다.
  let dailyTodoCategories: DailyTodoCategory[] = [];
  if (dtcats.error) {
    console.error("[repo.loadAll] daily_todo_categories 조회 실패:", dtcats.error);
  } else {
    dailyTodoCategories = (dtcats.data ?? []).map(toDailyTodoCategory);
    if (dailyTodoCategories.length === 0) {
      await sb
        .from("daily_todo_categories")
        .insert(SEED_DAILY_TODO_CATEGORIES.map(fromDailyTodoCategory));
      dailyTodoCategories = SEED_DAILY_TODO_CATEGORIES;
    }
  }

  // daily_todos는 시드가 없다 — 조회 실패를 빈 목록으로 넘기지 말고 원인만 남긴다.
  if (dtodos.error) {
    console.error("[repo.loadAll] daily_todos 조회 실패:", dtodos.error);
  }

  let dailyTodoSettings: DailyTodoSettings;
  if (dtset.error) {
    console.error("[repo.loadAll] daily_todo_settings 조회 실패:", dtset.error);
    dailyTodoSettings = SEED_DAILY_TODO_SETTINGS;
  } else {
    const settingsRow = (dtset.data ?? [])[0] as Record<string, unknown> | undefined;
    if (settingsRow) {
      dailyTodoSettings = { goalPct: (settingsRow.goal_pct as number) ?? 80 };
    } else {
      await sb
        .from("daily_todo_settings")
        .insert({ id: "singleton", goal_pct: SEED_DAILY_TODO_SETTINGS.goalPct });
      dailyTodoSettings = SEED_DAILY_TODO_SETTINGS;
    }
  }

  // budget_versions: 에러 없이 0행이면 다른 시드와 같은 패턴으로 v1을 만든다
  // (0025 마이그레이션과 같은 결과 — 기존 예산 중 version_id가 비어 있던 행도 v1으로 백필).
  // 에러(테이블 없음 등)면 v1을 합성하지 않는다 — localStorage 경로처럼 조용히 v1을
  // 지어내면 클라우드에서 진짜 장애가 났을 때도 예산이 있는 것처럼 보인다. 잘못된 값을
  // 보여주는 것보다 눈에 띄게 비어 있는 편이 낫다. 대신 콘솔에 원인을 남긴다.
  let budgets = (buds.data ?? []).map(toBudget);
  let budgetVersions: BudgetVersion[];
  if (bvs.error) {
    console.error("[repo.loadAll] budget_versions 조회 실패:", bvs.error);
    budgetVersions = [];
  } else {
    budgetVersions = (bvs.data ?? []).map(toBudgetVersion);
    if (budgetVersions.length === 0) {
      const v1: BudgetVersion = {
        id: "bv-1",
        name: "v1",
        startMonth: FIRST_BUDGET_MONTH,
        memo: null,
        createdAt: "",
      };
      await sb.from("budget_versions").insert(fromBudgetVersion(v1));
      budgetVersions = [v1];
      await sb.from("budgets").update({ version_id: v1.id }).is("version_id", null);
      budgets = budgets.map((b) => (b.versionId ? b : { ...b, versionId: v1.id }));
    }
  }

  return {
    categories,
    paymentMethods,
    recurring: (recs.data ?? []).map(toRec),
    transactions: (txns.data ?? []).map(toTxn),
    budgets,
    budgetVersions,
    goals: (goals.data ?? []).map(toGoal),
    localCurrencies: (lcs.data ?? []).map(toLc),
    rewardRules: (rules.data ?? []).map(toRule),
    coupons: (coups.data ?? []).map(toCoupon),
    weekTodos: (wtodos.data ?? []).map(toWeekTodo),
    baechooMeals: (meals.data ?? []).map(toMeal),
    baechooHealth: (healths.data ?? []).map(toHealth),
    baechooExams: (exams.data ?? []).map(toExam),
    baechooCategories,
    baechooHealthTodos: (htodos.data ?? []).map(toHealthTodo),
    baechooWalks: (walks.data ?? []).map(toWalk),
    ujuChecklists: (ujuChecks.data ?? []).map(toUjuChecklist),
    baechooVaccines: (vaccines.data ?? []).map(toVaccine),
    assetSnapshots: (assetSnaps.data ?? []).map(toAssetSnapshot),
    planItems,
    dailyTodos: (dtodos.data ?? []).map(toDailyTodo),
    dailyTodoCategories,
    dailyTodoSettings,
  };
}

async function sbUpsert(table: string, row: Record<string, unknown>) {
  await getSupabase()!.from(table).upsert(row);
}
// sbUpsert는 error를 버려 실패가 조용한 유실이 된다(저장소 전반의 기존 패턴 —
// 여기서 전역으로 바꾸지 않는다). 예산 버전은 버전 1행 + 예산 N행을 순차로 쓰는
// 다중 쓰기의 첫 단계라 실패를 삼키면 이후 행이 전부 FK 위반으로 죽어도 화면엔
// 완전한 버전이 그려진다. 그 경로(saveBudgetVersion·saveBudget)에서만 던진다.
async function sbUpsertOrThrow(table: string, row: Record<string, unknown>) {
  const { error } = await getSupabase()!.from(table).upsert(row);
  if (error) throw error;
}
async function sbDelete(table: string, id: string) {
  await getSupabase()!.from(table).delete().eq("id", id);
}
// 소프트 삭제: 실제로 지우지 않고 deleted_at만 기록(휴지통)
async function sbSoftDelete(table: string, id: string) {
  await getSupabase()!
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

export async function saveCategory(c: Category): Promise<Category> {
  const row = { ...c, id: c.id || newId() };
  if (hasSupabase) await sbUpsert("categories", fromCat(row));
  else lsUpsert("categories", row);
  return row;
}
export async function deleteCategory(id: string) {
  if (hasSupabase) await sbDelete("categories", id);
  else lsDelete("categories", id);
}

export async function savePaymentMethod(p: PaymentMethod): Promise<PaymentMethod> {
  const row = { ...p, id: p.id || newId() };
  if (hasSupabase) await sbUpsert("payment_methods", fromPm(row));
  else lsUpsert("paymentMethods", row);
  return row;
}
export async function deletePaymentMethod(id: string) {
  if (hasSupabase) await sbDelete("payment_methods", id);
  else lsDelete("paymentMethods", id);
}

export async function saveRecurring(x: RecurringExpense): Promise<RecurringExpense> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("recurring_expenses", fromRec(row));
  else lsUpsert("recurring", row);
  return row;
}
export async function deleteRecurring(id: string) {
  if (hasSupabase) await sbDelete("recurring_expenses", id);
  else lsDelete("recurring", id);
}

export async function saveTransaction(x: Transaction): Promise<Transaction> {
  // 신규 저장에만 입력 시각을 찍는다(수정 시엔 원래 순서 유지)
  const row = {
    ...x,
    id: x.id || newId(),
    createdAt: x.createdAt || new Date().toISOString(),
  };
  if (hasSupabase) await sbUpsert("transactions", fromTxn(row));
  else lsUpsert("transactions", row);
  return row;
}
export async function deleteTransaction(id: string) {
  if (hasSupabase) await sbDelete("transactions", id);
  else lsDelete("transactions", id);
}

export async function saveBudget(x: Budget): Promise<Budget> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsertOrThrow("budgets", fromBudget(row));
  else lsUpsert("budgets", row);
  return row;
}
export async function deleteBudget(id: string) {
  if (hasSupabase) await sbDelete("budgets", id);
  else lsDelete("budgets", id);
}

export async function saveBudgetVersion(x: BudgetVersion): Promise<BudgetVersion> {
  const row = { ...x, id: x.id || "bv-" + newId() };
  if (hasSupabase) await sbUpsertOrThrow("budget_versions", fromBudgetVersion(row));
  else lsUpsert("budgetVersions", row);
  return row;
}
export async function deleteBudgetVersion(id: string) {
  if (hasSupabase) await sbDelete("budget_versions", id);
  else lsDelete("budgetVersions", id);
}

export async function saveAssetSnapshot(x: AssetSnapshot): Promise<AssetSnapshot> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("asset_snapshots", fromAssetSnapshot(row));
  else lsUpsert("assetSnapshots", row);
  return row;
}
export async function deleteAssetSnapshot(id: string) {
  if (hasSupabase) await sbDelete("asset_snapshots", id);
  else lsDelete("assetSnapshots", id);
}

export async function savePlanItem(x: PlanItem): Promise<PlanItem> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("plan_items", fromPlanItem(row));
  else lsUpsert("planItems", row);
  return row;
}
export async function deletePlanItem(id: string) {
  if (hasSupabase) await sbDelete("plan_items", id);
  else lsDelete("planItems", id);
}

export async function saveDailyTodo(x: DailyTodo): Promise<DailyTodo> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("daily_todos", fromDailyTodo(row));
  else lsUpsert("dailyTodos", row);
  return row;
}
export async function deleteDailyTodo(id: string) {
  if (hasSupabase) await sbDelete("daily_todos", id);
  else lsDelete("dailyTodos", id);
}

export async function saveDailyTodoCategory(
  x: DailyTodoCategory
): Promise<DailyTodoCategory> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("daily_todo_categories", fromDailyTodoCategory(row));
  else lsUpsert("dailyTodoCategories", row);
  return row;
}
export async function deleteDailyTodoCategory(id: string) {
  if (hasSupabase) await sbDelete("daily_todo_categories", id);
  else lsDelete("dailyTodoCategories", id);
}

// 단일 행. 테이블의 id='singleton'은 여기서만 다룬다.
export async function saveDailyTodoSettings(
  s: DailyTodoSettings
): Promise<DailyTodoSettings> {
  if (hasSupabase) {
    await sbUpsert("daily_todo_settings", { id: "singleton", goal_pct: s.goalPct });
  } else {
    const snap = lsRead();
    snap.dailyTodoSettings = s;
    lsWrite(snap);
  }
  return s;
}

export async function saveLocalCurrency(x: LocalCurrency): Promise<LocalCurrency> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("local_currencies", fromLc(row));
  else lsUpsert("localCurrencies", row);
  return row;
}
export async function deleteLocalCurrency(id: string) {
  if (hasSupabase) await sbDelete("local_currencies", id);
  else lsDelete("localCurrencies", id);
}

export async function saveRewardRule(x: RewardRule): Promise<RewardRule> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("reward_rules", fromRule(row));
  else lsUpsert("rewardRules", row);
  return row;
}
export async function deleteRewardRule(id: string) {
  if (hasSupabase) await sbDelete("reward_rules", id);
  else lsDelete("rewardRules", id);
}

export async function saveCoupon(x: Coupon): Promise<Coupon> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("coupons", fromCoupon(row));
  else lsUpsert("coupons", row);
  return row;
}
export async function deleteCoupon(id: string) {
  if (hasSupabase) await sbDelete("coupons", id);
  else lsDelete("coupons", id);
}

export async function saveGoal(x: Goal): Promise<Goal> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("goals", fromGoal(row));
  else lsUpsert("goals", row);
  return row;
}
export async function deleteGoal(id: string) {
  if (hasSupabase) await sbDelete("goals", id);
  else lsDelete("goals", id);
}

export async function saveWeekTodo(x: WeekTodo): Promise<WeekTodo> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("week_todos", fromWeekTodo(row));
  else lsUpsert("weekTodos", row);
  return row;
}
export async function deleteWeekTodo(id: string) {
  if (hasSupabase) await sbDelete("week_todos", id);
  else lsDelete("weekTodos", id);
}

export async function saveBaechooMeal(x: BaechooMeal): Promise<BaechooMeal> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_meals", fromMeal(row));
  else lsUpsert("baechooMeals", row);
  return row;
}
export async function deleteBaechooMeal(id: string) {
  if (hasSupabase) await sbSoftDelete("baechoo_meals", id);
  else lsDelete("baechooMeals", id);
}

export async function saveBaechooHealth(x: BaechooHealth): Promise<BaechooHealth> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_health", fromHealth(row));
  else lsUpsert("baechooHealth", row);
  return row;
}
export async function deleteBaechooHealth(id: string) {
  if (hasSupabase) await sbSoftDelete("baechoo_health", id);
  else lsDelete("baechooHealth", id);
}

export async function saveBaechooExam(x: BaechooExam): Promise<BaechooExam> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_exams", fromExam(row));
  else lsUpsert("baechooExams", row);
  return row;
}
export async function deleteBaechooExam(id: string) {
  if (hasSupabase) await sbSoftDelete("baechoo_exams", id);
  else lsDelete("baechooExams", id);
}

export async function saveBaechooCategory(
  x: BaechooCategory
): Promise<BaechooCategory> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_categories", fromBCat(row));
  else lsUpsert("baechooCategories", row);
  return row;
}
export async function deleteBaechooCategory(id: string) {
  if (hasSupabase) await sbDelete("baechoo_categories", id);
  else lsDelete("baechooCategories", id);
}

export async function saveBaechooHealthTodo(
  x: BaechooHealthTodo
): Promise<BaechooHealthTodo> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_health_todos", fromHealthTodo(row));
  else lsUpsert("baechooHealthTodos", row);
  return row;
}
export async function deleteBaechooHealthTodo(id: string) {
  if (hasSupabase) await sbSoftDelete("baechoo_health_todos", id);
  else lsDelete("baechooHealthTodos", id);
}

export async function saveBaechooWalk(x: BaechooWalk): Promise<BaechooWalk> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_walks", fromWalk(row));
  else lsUpsert("baechooWalks", row);
  return row;
}
export async function deleteBaechooWalk(id: string) {
  if (hasSupabase) await sbSoftDelete("baechoo_walks", id);
  else lsDelete("baechooWalks", id);
}

export async function saveUjuChecklist(x: UjuChecklist): Promise<UjuChecklist> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("uju_checklists", fromUjuChecklist(row));
  else lsUpsert("ujuChecklists", row);
  return row;
}
export async function deleteUjuChecklist(id: string) {
  if (hasSupabase) await sbSoftDelete("uju_checklists", id);
  else lsDelete("ujuChecklists", id);
}

export async function saveBaechooVaccine(
  x: BaechooVaccine
): Promise<BaechooVaccine> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_vaccines", fromVaccine(row));
  else lsUpsert("baechooVaccines", row);
  return row;
}
export async function deleteBaechooVaccine(id: string) {
  if (hasSupabase) await sbSoftDelete("baechoo_vaccines", id);
  else lsDelete("baechooVaccines", id);
}

/* ───────────── 휴지통 (소프트 삭제 항목) ───────────── */
export type TrashKind =
  | "meal"
  | "health"
  | "exam"
  | "healthTodo"
  | "walk"
  | "ujuChecklist"
  | "vaccine";
export interface TrashItem {
  kind: TrashKind;
  table: string;
  id: string;
  deletedAt: string;
  label: string; // 종류 · 날짜 · 요점
}

const md = (iso?: string | null) =>
  iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : "";

// 휴지통 항목 전체 로드(삭제 시각 최신순)
export async function loadBaechooTrash(): Promise<TrashItem[]> {
  if (!hasSupabase) return [];
  const sb = getSupabase()!;
  const del = (table: string) =>
    sb
      .from(table)
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
  const [meals, healths, exams, htodos, walks, ujuChecks, vaccines] =
    await Promise.all([
      del("baechoo_meals"),
      del("baechoo_health"),
      del("baechoo_exams"),
      del("baechoo_health_todos"),
      del("baechoo_walks"),
      del("uju_checklists"),
      del("baechoo_vaccines"),
    ]);
  const items: TrashItem[] = [];
  for (const r of meals.data ?? []) {
    const m = toMeal(r);
    items.push({
      kind: "meal",
      table: "baechoo_meals",
      id: m.id,
      deletedAt: r.deleted_at,
      label: `식사 · ${md(m.date)} · ${m.content || "-"}`,
    });
  }
  for (const r of healths.data ?? []) {
    const h = toHealth(r);
    items.push({
      kind: "health",
      table: "baechoo_health",
      id: h.id,
      deletedAt: r.deleted_at,
      label: `건강 · ${md(h.date)} · ${h.title || "-"}`,
    });
  }
  for (const r of exams.data ?? []) {
    const e = toExam(r);
    items.push({
      kind: "exam",
      table: "baechoo_exams",
      id: e.id,
      deletedAt: r.deleted_at,
      label: `신체검사 · ${md(e.date)} · ${
        e.measureName ?? e.content ?? "-"
      }`,
    });
  }
  for (const r of htodos.data ?? []) {
    const t = toHealthTodo(r);
    items.push({
      kind: "healthTodo",
      table: "baechoo_health_todos",
      id: t.id,
      deletedAt: r.deleted_at,
      label: `할 일 · ${t.title || "-"}`,
    });
  }
  for (const r of walks.data ?? []) {
    const w = toWalk(r);
    items.push({
      kind: "walk",
      table: "baechoo_walks",
      id: w.id,
      deletedAt: r.deleted_at,
      label: `산책 · ${md(w.date)} · ${Math.round(w.distanceM)}m`,
    });
  }
  for (const r of ujuChecks.data ?? []) {
    const c = toUjuChecklist(r);
    items.push({
      kind: "ujuChecklist",
      table: "uju_checklists",
      id: c.id,
      deletedAt: r.deleted_at,
      label: `체크리스트 · ${md(c.dueDate)} · ${c.title || "-"}`,
    });
  }
  for (const r of vaccines.data ?? []) {
    const v = toVaccine(r);
    items.push({
      kind: "vaccine",
      table: "baechoo_vaccines",
      id: v.id,
      deletedAt: r.deleted_at,
      label: `예방접종 · ${v.name || "-"}`,
    });
  }
  items.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
  return items;
}

// 복원: deleted_at 제거
export async function restoreBaechoo(table: string, id: string) {
  if (hasSupabase)
    await getSupabase()!.from(table).update({ deleted_at: null }).eq("id", id);
}

// 영구 삭제(휴지통에서 완전 제거)
export async function hardDeleteBaechoo(table: string, id: string) {
  if (hasSupabase) await getSupabase()!.from(table).delete().eq("id", id);
}

// 30일 지난 휴지통 항목 자동 비우기(앱 로드 시 호출)
export async function purgeOldBaechooTrash(days = 30) {
  if (!hasSupabase) return;
  const sb = getSupabase()!;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  await Promise.all(
    [
      "baechoo_meals",
      "baechoo_health",
      "baechoo_exams",
      "baechoo_health_todos",
      "baechoo_walks",
      "uju_checklists",
      "baechoo_vaccines",
    ].map((t) => sb.from(t).delete().lt("deleted_at", cutoff))
  );
}
