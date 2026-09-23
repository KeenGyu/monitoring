import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Expense,
  NewAllocationInput,
  NewGoalInput,
  NewSpendingInput,
  SalaryConfig,
  SavingsGoal,
  SavingsTransaction,
  SpendingEntry,
} from "./types.salary";
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
  loadGoals,
  putGoal,
  deleteGoalRecord,
  loadSavingsTransactions,
  putSavingsTransaction,
  deleteSavingsTransaction,
} from "./lib/salaryDb";
import { makeId } from "./lib/id";
import { todayIso } from "./lib/dates";

interface SalaryContextValue {
  loading: boolean;
  config: SalaryConfig;
  expenses: Expense[];
  spending: SpendingEntry[];
  goals: SavingsGoal[];
  transactions: SavingsTransaction[];
  updateConfig: (patch: Partial<SalaryConfig>) => void;
  addExpense: (input: { description: string; amount: number; payPeriodDate: string; date?: string }) => void;
  editExpense: (id: string, input: { description: string; amount: number; payPeriodDate: string }) => void;
  deleteExpense: (id: string) => void;
  addSpending: (input: NewSpendingInput) => void;
  editSpending: (id: string, input: NewSpendingInput) => void;
  deleteSpending: (id: string) => void;
  addGoal: (input: NewGoalInput) => SavingsGoal;
  editGoal: (id: string, input: NewGoalInput) => void;
  archiveGoal: (id: string) => void;
  /** Hard-deletes only if the goal has no transaction history; otherwise archives it instead. */
  deleteGoal: (id: string) => void;
  allocate: (input: NewAllocationInput) => void;
  deleteAllocation: (id: string) => void;
}

const SalaryContext = createContext<SalaryContextValue | null>(null);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function SalaryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SalaryConfig>(DEFAULT_SALARY_CONFIG);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [spending, setSpending] = useState<SpendingEntry[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);

  useEffect(() => {
    Promise.all([
      loadSalaryConfig(),
      loadExpenses(),
      loadSpending(),
      loadGoals(),
      loadSavingsTransactions(),
    ]).then(([cfg, exp, spend, gls, txns]) => {
      setConfig(cfg);
      setExpenses(exp);
      setSpending(spend);
      setGoals(gls);
      setTransactions(txns);
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

  // ---- Savings goals ----

  function goalStatusFor(currentAmount: number, targetAmount: number, prevStatus: SavingsGoal["status"]) {
    if (prevStatus === "archived") return "archived" as const;
    if (targetAmount > 0 && currentAmount >= targetAmount) return "completed" as const;
    return "active" as const;
  }

  function addGoal(input: NewGoalInput): SavingsGoal {
    const goal: SavingsGoal = {
      id: makeId(),
      name: input.name.trim(),
      category: input.category,
      targetAmount: Math.max(0, input.targetAmount),
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      targetDate: input.targetDate,
      status: "active",
    };
    setGoals((prev) => [...prev, goal]);
    putGoal(goal);
    return goal;
  }

  function editGoal(id: string, input: NewGoalInput) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const targetAmount = Math.max(0, input.targetAmount);
        const updated: SavingsGoal = {
          ...g,
          name: input.name.trim(),
          category: input.category,
          targetAmount,
          targetDate: input.targetDate,
          status: goalStatusFor(g.currentAmount, targetAmount, g.status),
        };
        putGoal(updated);
        return updated;
      })
    );
  }

  function archiveGoal(id: string) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated: SavingsGoal = { ...g, status: "archived" };
        putGoal(updated);
        return updated;
      })
    );
  }

  function deleteGoal(id: string) {
    const hasHistory = transactions.some((t) => t.goalId === id);
    if (hasHistory) {
      // Never silently drop financial history — archive instead.
      archiveGoal(id);
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    deleteGoalRecord(id);
  }

  // ---- Allocations (savings transactions — never spending) ----

  function allocate(input: NewAllocationInput) {
    const amount = Math.max(0, input.amount);
    if (amount <= 0) return;
    const txn: SavingsTransaction = {
      id: makeId(),
      goalId: input.goalId,
      amount,
      date: todayIso(),
      note: (input.note ?? "").trim(),
      source: input.payPeriodDate ? "payout" : "manual",
      payPeriodDate: input.payPeriodDate ?? null,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [...prev, txn]);
    putSavingsTransaction(txn);

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== input.goalId) return g;
        const currentAmount = round2(g.currentAmount + amount);
        const updated: SavingsGoal = {
          ...g,
          currentAmount,
          status: goalStatusFor(currentAmount, g.targetAmount, g.status),
        };
        putGoal(updated);
        return updated;
      })
    );
  }

  function deleteAllocation(id: string) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    deleteSavingsTransaction(id);

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== txn.goalId) return g;
        const currentAmount = Math.max(0, round2(g.currentAmount - txn.amount));
        const updated: SavingsGoal = {
          ...g,
          currentAmount,
          status: goalStatusFor(currentAmount, g.targetAmount, g.status),
        };
        putGoal(updated);
        return updated;
      })
    );
  }

  const value = useMemo(
    () => ({
      loading,
      config,
      expenses,
      spending,
      goals,
      transactions,
      updateConfig,
      addExpense,
      editExpense,
      deleteExpense,
      addSpending,
      editSpending,
      deleteSpending,
      addGoal,
      editGoal,
      archiveGoal,
      deleteGoal,
      allocate,
      deleteAllocation,
    }),
    [loading, config, expenses, spending, goals, transactions]
  );

  return <SalaryContext.Provider value={value}>{children}</SalaryContext.Provider>;
}

export function useSalary(): SalaryContextValue {
  const ctx = useContext(SalaryContext);
  if (!ctx) throw new Error("useSalary must be used within a SalaryProvider");
  return ctx;
}