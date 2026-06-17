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
  Goal,
  RecurringExpense,
  Transaction,
} from "./types";

interface DataContextValue {
  loading: boolean;
  mode: "cloud" | "local";
  categories: Category[];
  recurring: RecurringExpense[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  categoryById: (id: string) => Category | undefined;
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
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const refresh = useCallback(async () => {
    const snap = await repo.loadAll();
    setCategories(snap.categories);
    setRecurring(snap.recurring);
    setTransactions(snap.transactions);
    setBudgets(snap.budgets);
    setGoals(snap.goals);
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
      recurring,
      transactions,
      budgets,
      goals,
      categoryById,
      refresh,
      saveTransaction: async (t) => {
        const saved = await repo.saveTransaction(t);
        upsertLocal(setTransactions, saved);
      },
      removeTransaction: async (id) => {
        await repo.deleteTransaction(id);
        setTransactions((p) => p.filter((x) => x.id !== id));
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
    }),
    [loading, categories, recurring, transactions, budgets, goals, categoryById, refresh]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
