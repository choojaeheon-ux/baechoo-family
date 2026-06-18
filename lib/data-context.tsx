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
  Budget,
  Category,
  Coupon,
  Goal,
  LocalCurrency,
  PaymentMethod,
  RecurringExpense,
  RewardRule,
  Transaction,
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
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
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
