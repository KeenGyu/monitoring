import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Expense, NewSpendingInput, SalaryConfig, SpendingEntry } from "./types.salary";
import { DEFAULT_SALARY_CONFIG } from "./types.salary";
import {
  loadSalaryConfig,
  putSalaryConfig,
  loadExpenses,
  putExpense,
  deleteExpenseRecord,
  loadSpending,
  putSpendingEntry,
  deleteSpendingRecord,
} from "./lib/salaryDb";
import { makeId } from "./lib/id";
import { todayIso } from "./lib/dates";

interface SalaryContextValue {
  loading: boolean;
  config: SalaryConfig;
  expenses: Expense[];
  spending: SpendingEntry[];
  updateConfig: (patch: Partial<SalaryConfig>) => void;
  addExpense: (input: { description: string; amount: number; payPeriodDate: string; date?: string }) => void;
  editExpense: (id: string, input: { description: string; amount: number; payPeriodDate: string }) => void;
  deleteExpense: (id: string) => void;
  addSpending: (input: NewSpendingInput) => void;
  editSpending: (id: string, input: NewSpendingInput) => void;
  deleteSpending: (id: string) => void;
}

const SalaryContext = createContext<SalaryContextValue | null>(null);

export function SalaryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SalaryConfig>(DEFAULT_SALARY_CONFIG);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [spending, setSpending] = useState<SpendingEntry[]>([]);

  useEffect(() => {
    Promise.all([loadSalaryConfig(), loadExpenses(), loadSpending()]).then(
      ([cfg, exp, spend]) => {
        setConfig(cfg);
        setExpenses(exp);
        setSpending(spend);
        setLoading(false);
      }
    );
  }, []);

  function updateConfig(patch: Partial<SalaryConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      putSalaryConfig(next);
      return next;
    });
  }

  function addExpense(input: { description: string; amount: number; payPeriodDate: string; date?: string }) {
    const expense: Expense = {
      id: makeId(),
      description: input.description,
      amount: input.amount,
      payPeriodDate: input.payPeriodDate,
      date: input.date ?? todayIso(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [...prev, expense]);
    putExpense(expense);
  }

  function editExpense(id: string, input: { description: string; amount: number; payPeriodDate: string }) {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...input };
        putExpense(updated);
        return updated;
      })
    );
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    deleteExpenseRecord(id);
  }

  function addSpending(input: NewSpendingInput) {
    const entry: SpendingEntry = {
      id: makeId(),
      description: input.description.trim(),
      amount: input.amount,
      date: input.date,
      createdAt: new Date().toISOString(),
    };
    setSpending((prev) => [...prev, entry]);
    putSpendingEntry(entry);
  }

  function editSpending(id: string, input: NewSpendingInput) {
    setSpending((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated: SpendingEntry = {
          ...e,
          description: input.description.trim(),
          amount: input.amount,
          date: input.date,
        };
        putSpendingEntry(updated);
        return updated;
      })
    );
  }

  function deleteSpending(id: string) {
    setSpending((prev) => prev.filter((e) => e.id !== id));
    deleteSpendingRecord(id);
  }

  const value = useMemo(
    () => ({
      loading,
      config,
      expenses,
      spending,
      updateConfig,
      addExpense,
      editExpense,
      deleteExpense,
      addSpending,
      editSpending,
      deleteSpending,
    }),
    [loading, config, expenses, spending]
  );

  return <SalaryContext.Provider value={value}>{children}</SalaryContext.Provider>;
}

export function useSalary(): SalaryContextValue {
  const ctx = useContext(SalaryContext);
  if (!ctx) throw new Error("useSalary must be used within a SalaryProvider");
  return ctx;
}