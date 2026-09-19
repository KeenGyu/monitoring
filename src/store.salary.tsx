import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Expense, SalaryConfig } from "./types.salary";
import { DEFAULT_SALARY_CONFIG } from "./types.salary";
import { loadSalaryConfig, putSalaryConfig, loadExpenses, putExpense, deleteExpenseRecord } from "./lib/salaryDb";
import { makeId } from "./lib/id";
import { todayIso } from "./lib/dates";

interface SalaryContextValue {
  loading: boolean;
  config: SalaryConfig;
  expenses: Expense[];
  updateConfig: (patch: Partial<SalaryConfig>) => void;
  addExpense: (input: { description: string; amount: number; payPeriodDate: string; date?: string }) => void;
  editExpense: (id: string, input: { description: string; amount: number; payPeriodDate: string }) => void;
  deleteExpense: (id: string) => void;
}

const SalaryContext = createContext<SalaryContextValue | null>(null);

export function SalaryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SalaryConfig>(DEFAULT_SALARY_CONFIG);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    Promise.all([loadSalaryConfig(), loadExpenses()]).then(([cfg, exp]) => {
      setConfig(cfg);
      setExpenses(exp);
      setLoading(false);
    });
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

  const value = useMemo(
    () => ({ loading, config, expenses, updateConfig, addExpense, editExpense, deleteExpense }),
    [loading, config, expenses]
  );

  return <SalaryContext.Provider value={value}>{children}</SalaryContext.Provider>;
}

export function useSalary(): SalaryContextValue {
  const ctx = useContext(SalaryContext);
  if (!ctx) throw new Error("useSalary must be used within a SalaryProvider");
  return ctx;
}