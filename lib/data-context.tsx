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
  Category,
  Coupon,
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
} from "./types";

interface DataContextValue {
  loading: boolean;
  mode: "cloud" | "local";
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
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
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

  const refresh = useCallback(async () => {
    const snap = await repo.loadAll();
    setCategories(snap.categories);
    setPaymentMethods(snap.paymentMethods);
    setRecurring(snap.recurring);
    setTransactions(snap.transactions);
    setBudgets(snap.budgets);
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
      categoryById,
      paymentMethodById,
      refresh,
      saveTransaction: async (t) => {
        const saved = await repo.saveTransaction(t);
        upsertLocal(setTransactions, saved);
      },
      removeTransaction: async (id) => {
        const tx = transactions.find((t) => t.id === id);
        await repo.deleteTransaction(id);
        setTransactions((p) => p.filter((x) => x.id !== id));
        if (tx?.localCurrencyId) {
          const lc = localCurrencies.find((l) => l.id === tx.localCurrencyId);
          if (lc) {
            const saved = await repo.saveLocalCurrency({
              ...lc,
              balance: Math.max(lc.balance - tx.amount, 0),
            });
            upsertLocal(setLocalCurrencies, saved);
          }
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
    }),
    [
      loading,
      categories,
      paymentMethods,
      recurring,
      transactions,
      budgets,
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
      categoryById,
      paymentMethodById,
      refresh,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
