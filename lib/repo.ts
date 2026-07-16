// 데이터 저장소 — Supabase 키가 있으면 클라우드, 없으면 localStorage
import { getSupabase, hasSupabase } from "./supabase";
import {
  SEED_CATEGORIES,
  SEED_PAYMENT_METHODS,
  SEED_BAECHOO_CATEGORIES,
  SEED_PLAN_ITEMS,
  SEED_EVENT_CATEGORIES,
} from "./seed";
import type {
  AssetSnapshot,
  Budget,
  Category,
  Coupon,
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
  FamilyEvent,
  EventCategory,
  LatLng,
  Stool,
  MealType,
  HealthType,
  ExamType,
  CategoryGroup,
  HealthTodoKind,
} from "./types";

const LS_KEY = "baechoo-budget-v1";

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
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

// 구버전 localStorage 일정(assignee만 있음)을 categoryId로 승격
function normalizeFamilyEvent(x: FamilyEvent): FamilyEvent {
  const legacy = x as FamilyEvent & { assignee?: string };
  if (!x.categoryId && legacy.assignee) {
    return { ...x, categoryId: "cat-" + legacy.assignee };
  }
  return x;
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
        eventCategories: SEED_EVENT_CATEGORIES,
      };
      window.localStorage.setItem(LS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<DataSnapshot>;
    return {
      categories: parsed.categories ?? [],
      paymentMethods: parsed.paymentMethods ?? SEED_PAYMENT_METHODS,
      recurring: parsed.recurring ?? [],
      transactions: parsed.transactions ?? [],
      budgets: parsed.budgets ?? [],
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
      familyEvents: (parsed.familyEvents ?? []).map(normalizeFamilyEvent),
      eventCategories: parsed.eventCategories ?? SEED_EVENT_CATEGORIES,
      planItems: parsed.planItems ?? SEED_PLAN_ITEMS,
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
    familyEvents: [],
    eventCategories: [],
    planItems: [],
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
  color: r.color as string,
  icon: (r.icon as string) ?? undefined,
});
const fromCat = (c: Category) => ({
  id: c.id,
  name: c.name,
  type: c.type,
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
  memo: (r.memo as string) ?? null,
  member: r.member as Transaction["member"],
  paymentMethodId: (r.payment_method_id as string) ?? null,
  isSpecial: Boolean(r.is_special),
  habitTag: (r.habit_tag as string) ?? null,
  source: r.source as Transaction["source"],
  recurringId: (r.recurring_id as string) ?? null,
  localCurrencyId: (r.local_currency_id as string) ?? null,
  isPaid: Boolean(r.is_paid),
});
const fromTxn = (x: Transaction) => ({
  id: x.id,
  date: x.date,
  amount: x.amount,
  type: x.type,
  category_id: x.categoryId,
  memo: x.memo,
  member: x.member,
  payment_method_id: x.paymentMethodId,
  is_special: x.isSpecial,
  habit_tag: x.habitTag,
  source: x.source,
  recurring_id: x.recurringId,
  local_currency_id: x.localCurrencyId,
  is_paid: x.isPaid,
});

const toBudget = (r: Record<string, unknown>): Budget => ({
  id: r.id as string,
  yearMonth: (r.year_month as string) ?? null,
  categoryId: (r.category_id as string) ?? null,
  amount: Number(r.amount),
});
const fromBudget = (x: Budget) => ({
  id: x.id,
  year_month: x.yearMonth,
  category_id: x.categoryId,
  amount: x.amount,
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

// 가족 캘린더 일정
const toFamilyEvent = (r: Record<string, unknown>): FamilyEvent => ({
  id: r.id as string,
  title: (r.title as string) ?? "",
  startDate: (r.start_date as string) ?? "",
  endDate: (r.end_date as string) ?? null,
  time: (r.time as string) ?? null,
  categoryId: (r.category_id as string) ?? "cat-together",
  memo: (r.memo as string) ?? null,
  recurrence: (r.recurrence as FamilyEvent["recurrence"]) ?? "none",
  repeatInterval: Number(r.repeat_interval ?? 1),
  repeatUntil: (r.repeat_until as string) ?? null,
  exceptions: Array.isArray(r.exceptions) ? (r.exceptions as string[]) : [],
  createdAt: (r.created_at as string) ?? "",
});
const fromFamilyEvent = (x: FamilyEvent) => ({
  id: x.id,
  title: x.title,
  start_date: x.startDate,
  end_date: x.endDate,
  time: x.time,
  category_id: x.categoryId,
  memo: x.memo,
  recurrence: x.recurrence,
  repeat_interval: x.repeatInterval,
  repeat_until: x.repeatUntil,
  exceptions: x.exceptions,
  created_at: x.createdAt || null,
});

// 캘린더 카테고리
const toEventCategory = (r: Record<string, unknown>): EventCategory => ({
  id: r.id as string,
  name: (r.name as string) ?? "",
  color: (r.color as string) ?? "#7c766a",
  emoji: (r.emoji as string) ?? null,
  sortOrder: Number(r.sort_order ?? 0),
  createdAt: (r.created_at as string) ?? "",
});
const fromEventCategory = (x: EventCategory) => ({
  id: x.id,
  name: x.name,
  color: x.color,
  emoji: x.emoji,
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
    ecats,
    fevents,
    plans,
  ] = await Promise.all([
    sb.from("categories").select("*"),
    sb.from("payment_methods").select("*"),
    sb.from("recurring_expenses").select("*"),
    sb.from("transactions").select("*"),
    sb.from("budgets").select("*"),
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
    sb.from("event_categories").select("*"),
    sb.from("family_events").select("*").is("deleted_at", null),
    sb.from("plan_items").select("*"),
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
  let eventCategories = (ecats.data ?? []).map(toEventCategory);
  if (eventCategories.length === 0) {
    await sb.from("event_categories").insert(SEED_EVENT_CATEGORIES.map(fromEventCategory));
    eventCategories = SEED_EVENT_CATEGORIES;
  }
  return {
    categories,
    paymentMethods,
    recurring: (recs.data ?? []).map(toRec),
    transactions: (txns.data ?? []).map(toTxn),
    budgets: (buds.data ?? []).map(toBudget),
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
    eventCategories,
    familyEvents: (fevents.data ?? []).map(toFamilyEvent).map(normalizeFamilyEvent),
    planItems,
  };
}

async function sbUpsert(table: string, row: Record<string, unknown>) {
  await getSupabase()!.from(table).upsert(row);
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
  const row = { ...x, id: x.id || newId() };
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
  if (hasSupabase) await sbUpsert("budgets", fromBudget(row));
  else lsUpsert("budgets", row);
  return row;
}
export async function deleteBudget(id: string) {
  if (hasSupabase) await sbDelete("budgets", id);
  else lsDelete("budgets", id);
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

export async function saveFamilyEvent(x: FamilyEvent): Promise<FamilyEvent> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("family_events", fromFamilyEvent(row));
  else lsUpsert("familyEvents", row);
  return row;
}
export async function deleteFamilyEvent(id: string) {
  if (hasSupabase) await sbSoftDelete("family_events", id);
  else lsDelete("familyEvents", id);
}

export async function saveEventCategory(c: EventCategory): Promise<EventCategory> {
  const row = { ...c, id: c.id || newId() };
  if (hasSupabase) await sbUpsert("event_categories", fromEventCategory(row));
  else lsUpsert("eventCategories", row);
  return row;
}
export async function deleteEventCategory(id: string) {
  if (hasSupabase) await sbDelete("event_categories", id);
  else lsDelete("eventCategories", id);
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
  | "vaccine"
  | "familyEvent";
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
  const [meals, healths, exams, htodos, walks, ujuChecks, vaccines, fevents] =
    await Promise.all([
      del("baechoo_meals"),
      del("baechoo_health"),
      del("baechoo_exams"),
      del("baechoo_health_todos"),
      del("baechoo_walks"),
      del("uju_checklists"),
      del("baechoo_vaccines"),
      del("family_events"),
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
  for (const r of fevents.data ?? []) {
    const e = toFamilyEvent(r);
    items.push({
      kind: "familyEvent",
      table: "family_events",
      id: e.id,
      deletedAt: r.deleted_at,
      label: `일정 · ${md(e.startDate)} · ${e.title || "-"}`,
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
      "family_events",
    ].map((t) => sb.from(t).delete().lt("deleted_at", cutoff))
  );
}
