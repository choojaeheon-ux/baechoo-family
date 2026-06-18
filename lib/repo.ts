// 데이터 저장소 — Supabase 키가 있으면 클라우드, 없으면 localStorage
import { getSupabase, hasSupabase } from "./supabase";
import {
  SEED_CATEGORIES,
  SEED_PAYMENT_METHODS,
  SEED_BAECHOO_CATEGORIES,
} from "./seed";
import type {
  Budget,
  Category,
  Coupon,
  DataSnapshot,
  Goal,
  LocalCurrency,
  PaymentMethod,
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
  yearMonth: r.year_month as string,
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
    sb.from("baechoo_meals").select("*"),
    sb.from("baechoo_health").select("*"),
    sb.from("baechoo_exams").select("*"),
    sb.from("baechoo_categories").select("*"),
    sb.from("baechoo_health_todos").select("*"),
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
  };
}

async function sbUpsert(table: string, row: Record<string, unknown>) {
  await getSupabase()!.from(table).upsert(row);
}
async function sbDelete(table: string, id: string) {
  await getSupabase()!.from(table).delete().eq("id", id);
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
  if (hasSupabase) await sbDelete("baechoo_meals", id);
  else lsDelete("baechooMeals", id);
}

export async function saveBaechooHealth(x: BaechooHealth): Promise<BaechooHealth> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_health", fromHealth(row));
  else lsUpsert("baechooHealth", row);
  return row;
}
export async function deleteBaechooHealth(id: string) {
  if (hasSupabase) await sbDelete("baechoo_health", id);
  else lsDelete("baechooHealth", id);
}

export async function saveBaechooExam(x: BaechooExam): Promise<BaechooExam> {
  const row = { ...x, id: x.id || newId() };
  if (hasSupabase) await sbUpsert("baechoo_exams", fromExam(row));
  else lsUpsert("baechooExams", row);
  return row;
}
export async function deleteBaechooExam(id: string) {
  if (hasSupabase) await sbDelete("baechoo_exams", id);
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
  if (hasSupabase) await sbDelete("baechoo_health_todos", id);
  else lsDelete("baechooHealthTodos", id);
}
