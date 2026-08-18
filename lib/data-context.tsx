"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { hasSupabase } from "./supabase";
import * as repo from "./repo";
import type {
  AssetSnapshot,
  Budget,
  BudgetVersion,
  Category,
  Coupon,
  DailyTodo,
  DailyTodoCategory,
  DailyTodoSettings,
  Goal,
  LocalCurrency,
  PaymentMethod,
  RecurringExpense,
  RewardRule,
  Transaction,
  WeekTodo,
  BaechooMeal,
  BaechooHealth,
  BaechooExam,
  BaechooCategory,
  BaechooHealthTodo,
  BaechooWalk,
  UjuChecklist,
  BaechooVaccine,
  PlanItem,
} from "./types";

interface DataContextValue {
  loading: boolean;
  mode: "cloud" | "local";
  categories: Category[];
  paymentMethods: PaymentMethod[];
  recurring: RecurringExpense[];
  transactions: Transaction[];
  budgets: Budget[];
  budgetVersions: BudgetVersion[];
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
  planItems: PlanItem[];
  dailyTodos: DailyTodo[];
  dailyTodoCategories: DailyTodoCategory[];
  dailyTodoSettings: DailyTodoSettings;
  categoryById: (id: string) => Category | undefined;
  paymentMethodById: (id: string) => PaymentMethod | undefined;
  refresh: () => Promise<void>;
  // mutators
  saveTransaction: (t: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  saveRecurring: (r: RecurringExpense) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  saveBudget: (b: Budget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  saveBudgetVersion: (v: BudgetVersion) => Promise<void>;
  removeBudgetVersion: (id: string) => Promise<void>;
  // 버전 행 + 그 버전의 예산 행 전체를 새 id로 복사한다. 새 버전 id를 돌려준다.
  duplicateBudgetVersion: (
    sourceId: string,
    name: string,
    startMonth: string
  ) => Promise<string>;
  saveGoal: (g: Goal) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  saveCategory: (c: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  savePaymentMethod: (p: PaymentMethod) => Promise<void>;
  removePaymentMethod: (id: string) => Promise<void>;
  saveLocalCurrency: (l: LocalCurrency) => Promise<void>;
  removeLocalCurrency: (id: string) => Promise<void>;
  saveRewardRule: (r: RewardRule) => Promise<void>;
  removeRewardRule: (id: string) => Promise<void>;
  saveCoupon: (c: Coupon) => Promise<void>;
  removeCoupon: (id: string) => Promise<void>;
  saveWeekTodo: (t: WeekTodo) => Promise<void>;
  removeWeekTodo: (id: string) => Promise<void>;
  saveBaechooMeal: (m: BaechooMeal) => Promise<void>;
  removeBaechooMeal: (id: string) => Promise<void>;
  saveBaechooHealth: (h: BaechooHealth) => Promise<void>;
  removeBaechooHealth: (id: string) => Promise<void>;
  saveBaechooExam: (e: BaechooExam) => Promise<void>;
  removeBaechooExam: (id: string) => Promise<void>;
  saveBaechooCategory: (c: BaechooCategory) => Promise<void>;
  removeBaechooCategory: (id: string) => Promise<void>;
  saveBaechooHealthTodo: (t: BaechooHealthTodo) => Promise<void>;
  removeBaechooHealthTodo: (id: string) => Promise<void>;
  saveBaechooWalk: (w: BaechooWalk) => Promise<void>;
  removeBaechooWalk: (id: string) => Promise<void>;
  saveUjuChecklist: (c: UjuChecklist) => Promise<void>;
  removeUjuChecklist: (id: string) => Promise<void>;
  saveBaechooVaccine: (v: BaechooVaccine) => Promise<void>;
  removeBaechooVaccine: (id: string) => Promise<void>;
  saveAssetSnapshot: (a: AssetSnapshot) => Promise<void>;
  removeAssetSnapshot: (id: string) => Promise<void>;
  savePlanItem: (p: PlanItem) => Promise<void>;
  removePlanItem: (id: string) => Promise<void>;
  saveDailyTodo: (t: DailyTodo) => Promise<void>;
  removeDailyTodo: (id: string) => Promise<void>;
  saveDailyTodoCategory: (c: DailyTodoCategory) => Promise<void>;
  removeDailyTodoCategory: (id: string) => Promise<void>;
  saveDailyTodoSettings: (s: DailyTodoSettings) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetVersions, setBudgetVersions] = useState<BudgetVersion[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [localCurrencies, setLocalCurrencies] = useState<LocalCurrency[]>([]);
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [weekTodos, setWeekTodos] = useState<WeekTodo[]>([]);
  const [baechooMeals, setBaechooMeals] = useState<BaechooMeal[]>([]);
  const [baechooHealth, setBaechooHealth] = useState<BaechooHealth[]>([]);
  const [baechooExams, setBaechooExams] = useState<BaechooExam[]>([]);
  const [baechooCategories, setBaechooCategories] = useState<BaechooCategory[]>([]);
  const [baechooHealthTodos, setBaechooHealthTodos] = useState<
    BaechooHealthTodo[]
  >([]);
  const [baechooWalks, setBaechooWalks] = useState<BaechooWalk[]>([]);
  const [ujuChecklists, setUjuChecklists] = useState<UjuChecklist[]>([]);
  const [baechooVaccines, setBaechooVaccines] = useState<BaechooVaccine[]>([]);
  const [assetSnapshots, setAssetSnapshots] = useState<AssetSnapshot[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [dailyTodos, setDailyTodos] = useState<DailyTodo[]>([]);
  const [dailyTodoCategories, setDailyTodoCategories] = useState<DailyTodoCategory[]>([]);
  const [dailyTodoSettings, setDailyTodoSettings] = useState<DailyTodoSettings>({ goalPct: 80 });

  const refresh = useCallback(async () => {
    const snap = await repo.loadAll();
    setCategories(snap.categories);
    setPaymentMethods(snap.paymentMethods);
    setRecurring(snap.recurring);
    setTransactions(snap.transactions);
    setBudgets(snap.budgets);
    setBudgetVersions(snap.budgetVersions);
    setGoals(snap.goals);
    setLocalCurrencies(snap.localCurrencies);
    setRewardRules(snap.rewardRules);
    setCoupons(snap.coupons);
    setWeekTodos(snap.weekTodos);
    setBaechooMeals(snap.baechooMeals);
    setBaechooHealth(snap.baechooHealth);
    setBaechooExams(snap.baechooExams);
    setBaechooCategories(snap.baechooCategories);
    setBaechooHealthTodos(snap.baechooHealthTodos);
    setBaechooWalks(snap.baechooWalks);
    setUjuChecklists(snap.ujuChecklists);
    setBaechooVaccines(snap.baechooVaccines);
    setAssetSnapshots(snap.assetSnapshots);
    setPlanItems(snap.planItems);
    setDailyTodos(snap.dailyTodos);
    setDailyTodoCategories(snap.dailyTodoCategories);
    setDailyTodoSettings(snap.dailyTodoSettings);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
        // 30일 지난 휴지통 항목 자동 비우기(실패해도 무시)
        repo.purgeOldBaechooTrash().catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const categoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );
  const paymentMethodById = useCallback(
    (id: string) => paymentMethods.find((p) => p.id === id),
    [paymentMethods]
  );

  // 지역화폐 잔액 증감 적용 (양수 = 되돌림/충전, 음수 = 차감).
  // 0으로 자르지 않는다 — 자르면 거래를 지웠을 때 되돌릴 금액이 사라진다(잔액이 음수면 화면에서 빨갛게 보인다).
  const applyLocalCurrencyDelta = useCallback(
    async (delta: Map<string, number>) => {
      for (const [lcId, amount] of delta) {
        if (amount === 0) continue;
        const lc = localCurrencies.find((l) => l.id === lcId);
        if (!lc) continue;
        const saved = await repo.saveLocalCurrency({
          ...lc,
          balance: lc.balance + amount,
        });
        setLocalCurrencies((prev) => {
          const idx = prev.findIndex((p) => p.id === saved.id);
          if (idx < 0) return [...prev, saved];
          const next = prev.slice();
          next[idx] = saved;
          return next;
        });
      }
    },
    [localCurrencies]
  );

  // 낙관적 업데이트 헬퍼
  const upsertLocal = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    row: T
  ) =>
    setter((prev) => {
      const idx = prev.findIndex((p) => p.id === row.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = row;
        return next;
      }
      return [...prev, row];
    });

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      mode: hasSupabase ? "cloud" : "local",
      categories,
      paymentMethods,
      recurring,
      transactions,
      budgets,
      budgetVersions,
      goals,
      localCurrencies,
      rewardRules,
      coupons,
      weekTodos,
      baechooMeals,
      baechooHealth,
      baechooExams,
      baechooCategories,
      baechooHealthTodos,
      baechooWalks,
      ujuChecklists,
      baechooVaccines,
      assetSnapshots,
      planItems,
      dailyTodos,
      dailyTodoCategories,
      dailyTodoSettings,
      categoryById,
      paymentMethodById,
      refresh,
      saveTransaction: async (t) => {
        // 지역화폐로 결제하면 잔액을 차감한다.
        // 수정일 수 있으므로 "이전 상태 되돌리기 → 새 상태 적용" 순으로 델타를 계산한다.
        const prev = t.id ? transactions.find((x) => x.id === t.id) : undefined;
        const saved = await repo.saveTransaction(t);
        const delta = new Map<string, number>();
        const add = (lcId: string | null, amount: number) => {
          if (!lcId) return;
          delta.set(lcId, (delta.get(lcId) ?? 0) + amount);
        };
        if (prev?.type === "expense") add(prev.localCurrencyId, prev.amount); // 되돌리기(+)
        if (saved.type === "expense") add(saved.localCurrencyId, -saved.amount); // 차감(−)
        await applyLocalCurrencyDelta(delta);
        upsertLocal(setTransactions, saved);
      },
      removeTransaction: async (id) => {
        const tx = transactions.find((t) => t.id === id);
        await repo.deleteTransaction(id);
        setTransactions((p) => p.filter((x) => x.id !== id));
        // 지역화폐로 결제했던 지출이면 잔액을 되돌린다.
        if (tx?.localCurrencyId && tx.type === "expense") {
          await applyLocalCurrencyDelta(
            new Map([[tx.localCurrencyId, tx.amount]])
          );
        }
      },
      saveRecurring: async (r) => {
        const saved = await repo.saveRecurring(r);
        upsertLocal(setRecurring, saved);
      },
      removeRecurring: async (id) => {
        await repo.deleteRecurring(id);
        setRecurring((p) => p.filter((x) => x.id !== id));
      },
      saveBudget: async (b) => {
        const saved = await repo.saveBudget(b);
        upsertLocal(setBudgets, saved);
      },
      removeBudget: async (id) => {
        await repo.deleteBudget(id);
        setBudgets((p) => p.filter((x) => x.id !== id));
      },
      saveBudgetVersion: async (v) => {
        const saved = await repo.saveBudgetVersion(v);
        upsertLocal(setBudgetVersions, saved);
      },
      removeBudgetVersion: async (id) => {
        // 예산 행을 먼저 지운다 — 버전만 지우면 고아 행이 남는다.
        for (const b of budgets.filter((x) => x.versionId === id)) {
          await repo.deleteBudget(b.id);
        }
        setBudgets((p) => p.filter((x) => x.versionId !== id));
        await repo.deleteBudgetVersion(id);
        setBudgetVersions((p) => p.filter((x) => x.id !== id));
      },
      duplicateBudgetVersion: async (sourceId, name, startMonth) => {
        const saved = await repo.saveBudgetVersion({
          id: "",
          name,
          startMonth,
          memo: null,
          createdAt: new Date().toISOString(),
        });
        upsertLocal(setBudgetVersions, saved);
        for (const b of budgets.filter((x) => x.versionId === sourceId)) {
          // budgets.id는 uuid 타입이라 슬러그를 넣으면 400 22P02가 난다.
          const copy = await repo.saveBudget({ ...b, id: "", versionId: saved.id });
          upsertLocal(setBudgets, copy);
        }
        return saved.id;
      },
      saveGoal: async (g) => {
        const saved = await repo.saveGoal(g);
        upsertLocal(setGoals, saved);
      },
      removeGoal: async (id) => {
        await repo.deleteGoal(id);
        setGoals((p) => p.filter((x) => x.id !== id));
      },
      saveCategory: async (c) => {
        const saved = await repo.saveCategory(c);
        upsertLocal(setCategories, saved);
      },
      removeCategory: async (id) => {
        await repo.deleteCategory(id);
        setCategories((p) => p.filter((x) => x.id !== id));
      },
      savePaymentMethod: async (p) => {
        const saved = await repo.savePaymentMethod(p);
        upsertLocal(setPaymentMethods, saved);
      },
      removePaymentMethod: async (id) => {
        await repo.deletePaymentMethod(id);
        setPaymentMethods((p) => p.filter((x) => x.id !== id));
      },
      saveLocalCurrency: async (l) => {
        const saved = await repo.saveLocalCurrency(l);
        upsertLocal(setLocalCurrencies, saved);
      },
      removeLocalCurrency: async (id) => {
        await repo.deleteLocalCurrency(id);
        setLocalCurrencies((p) => p.filter((x) => x.id !== id));
      },
      saveRewardRule: async (r) => {
        const saved = await repo.saveRewardRule(r);
        upsertLocal(setRewardRules, saved);
      },
      removeRewardRule: async (id) => {
        await repo.deleteRewardRule(id);
        setRewardRules((p) => p.filter((x) => x.id !== id));
      },
      saveCoupon: async (c) => {
        const saved = await repo.saveCoupon(c);
        upsertLocal(setCoupons, saved);
      },
      removeCoupon: async (id) => {
        await repo.deleteCoupon(id);
        setCoupons((p) => p.filter((x) => x.id !== id));
      },
      saveWeekTodo: async (t) => {
        const saved = await repo.saveWeekTodo(t);
        upsertLocal(setWeekTodos, saved);
      },
      removeWeekTodo: async (id) => {
        await repo.deleteWeekTodo(id);
        setWeekTodos((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooMeal: async (m) => {
        const saved = await repo.saveBaechooMeal(m);
        upsertLocal(setBaechooMeals, saved);
      },
      removeBaechooMeal: async (id) => {
        await repo.deleteBaechooMeal(id);
        setBaechooMeals((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooHealth: async (h) => {
        const saved = await repo.saveBaechooHealth(h);
        upsertLocal(setBaechooHealth, saved);
      },
      removeBaechooHealth: async (id) => {
        await repo.deleteBaechooHealth(id);
        setBaechooHealth((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooExam: async (e) => {
        const saved = await repo.saveBaechooExam(e);
        upsertLocal(setBaechooExams, saved);
      },
      removeBaechooExam: async (id) => {
        await repo.deleteBaechooExam(id);
        setBaechooExams((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooCategory: async (c) => {
        const saved = await repo.saveBaechooCategory(c);
        upsertLocal(setBaechooCategories, saved);
      },
      removeBaechooCategory: async (id) => {
        await repo.deleteBaechooCategory(id);
        setBaechooCategories((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooHealthTodo: async (t) => {
        const saved = await repo.saveBaechooHealthTodo(t);
        upsertLocal(setBaechooHealthTodos, saved);
      },
      removeBaechooHealthTodo: async (id) => {
        await repo.deleteBaechooHealthTodo(id);
        setBaechooHealthTodos((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooWalk: async (w) => {
        const saved = await repo.saveBaechooWalk(w);
        upsertLocal(setBaechooWalks, saved);
      },
      removeBaechooWalk: async (id) => {
        await repo.deleteBaechooWalk(id);
        setBaechooWalks((p) => p.filter((x) => x.id !== id));
      },
      saveUjuChecklist: async (c) => {
        const saved = await repo.saveUjuChecklist(c);
        upsertLocal(setUjuChecklists, saved);
      },
      removeUjuChecklist: async (id) => {
        await repo.deleteUjuChecklist(id);
        setUjuChecklists((p) => p.filter((x) => x.id !== id));
      },
      saveBaechooVaccine: async (v) => {
        const saved = await repo.saveBaechooVaccine(v);
        upsertLocal(setBaechooVaccines, saved);
      },
      removeBaechooVaccine: async (id) => {
        await repo.deleteBaechooVaccine(id);
        setBaechooVaccines((p) => p.filter((x) => x.id !== id));
      },
      saveAssetSnapshot: async (a) => {
        const saved = await repo.saveAssetSnapshot(a);
        upsertLocal(setAssetSnapshots, saved);
      },
      removeAssetSnapshot: async (id) => {
        await repo.deleteAssetSnapshot(id);
        setAssetSnapshots((p) => p.filter((x) => x.id !== id));
      },
      savePlanItem: async (p) => {
        const saved = await repo.savePlanItem(p);
        upsertLocal(setPlanItems, saved);
      },
      removePlanItem: async (id) => {
        await repo.deletePlanItem(id);
        setPlanItems((p) => p.filter((x) => x.id !== id));
      },
      saveDailyTodo: async (t) => {
        const saved = await repo.saveDailyTodo(t);
        upsertLocal(setDailyTodos, saved);
      },
      removeDailyTodo: async (id) => {
        await repo.deleteDailyTodo(id);
        setDailyTodos((p) => p.filter((x) => x.id !== id));
      },
      saveDailyTodoCategory: async (c) => {
        const saved = await repo.saveDailyTodoCategory(c);
        upsertLocal(setDailyTodoCategories, saved);
      },
      removeDailyTodoCategory: async (id) => {
        await repo.deleteDailyTodoCategory(id);
        setDailyTodoCategories((p) => p.filter((x) => x.id !== id));
      },
      saveDailyTodoSettings: async (s) => {
        const saved = await repo.saveDailyTodoSettings(s);
        setDailyTodoSettings(saved);
      },
    }),
    [
      loading,
      categories,
      paymentMethods,
      recurring,
      transactions,
      budgets,
      budgetVersions,
      goals,
      localCurrencies,
      rewardRules,
      coupons,
      weekTodos,
      baechooMeals,
      baechooHealth,
      baechooExams,
      baechooCategories,
      baechooHealthTodos,
      baechooWalks,
      ujuChecklists,
      baechooVaccines,
      assetSnapshots,
      planItems,
      dailyTodos,
      dailyTodoCategories,
      dailyTodoSettings,
      categoryById,
      paymentMethodById,
      refresh,
      applyLocalCurrencyDelta,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
