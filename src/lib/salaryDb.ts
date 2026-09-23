import type { Expense, SalaryConfig, SavingsGoal, SavingsTransaction, SpendingEntry } from "../types.salary";
import { DEFAULT_SALARY_CONFIG } from "../types.salary";

// Separate IndexedDB database from db.ts, so adding the salary tracker
// never touches (or risks) your existing reports/activity/absentees data.

const DB_NAME = "qms-work-monitor-salary";
const DB_VERSION = 3;
const STORE_EXPENSES = "expenses";
const STORE_CONFIG = "config";
const STORE_SPENDING = "spending";
const STORE_GOALS = "goals";
const STORE_TRANSACTIONS = "savingsTransactions";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
        db.createObjectStore(STORE_EXPENSES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_SPENDING)) {
        db.createObjectStore(STORE_SPENDING, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_GOALS)) {
        db.createObjectStore(STORE_GOALS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        db.createObjectStore(STORE_TRANSACTIONS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

function getAll<T>(storeName: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      })
  );
}

// ---- Config ----

export function loadSalaryConfig(): Promise<SalaryConfig> {
  return tx<{ key: string; value: SalaryConfig } | undefined>(
    STORE_CONFIG,
    "readonly",
    (store) => store.get("salary-config")
  ).then((row) => {
    const saved = (row?.value ?? {}) as Partial<SalaryConfig>;
    // Configs saved before employment status existed were all at the old
    // 540 rate, so treat them as probationary instead of jumping to 570.
    const isLegacy = row && saved.employmentStatus === undefined;
    return {
      ...DEFAULT_SALARY_CONFIG,
      ...saved,
      ...(isLegacy ? { employmentStatus: "probationary" as const } : {}),
    };
  });
}

export function putSalaryConfig(config: SalaryConfig): Promise<void> {
  return tx(STORE_CONFIG, "readwrite", (store) =>
    store.put({ key: "salary-config", value: config })
  ).then(() => undefined);
}

// ---- Expenses (pre-payout deductions, e.g. cash advances) ----

export function loadExpenses(): Promise<Expense[]> {
  return getAll<Expense>(STORE_EXPENSES);
}

export function putExpense(expense: Expense): Promise<void> {
  return tx(STORE_EXPENSES, "readwrite", (store) => store.put(expense)).then(
    () => undefined
  );
}

export function deleteExpenseRecord(id: string): Promise<void> {
  return tx(STORE_EXPENSES, "readwrite", (store) => store.delete(id)).then(
    () => undefined
  );
}

// ---- Spending log (post-payout — where the money actually went) ----

export function loadSpending(): Promise<SpendingEntry[]> {
  return getAll<SpendingEntry>(STORE_SPENDING);
}

export function putSpendingEntry(entry: SpendingEntry): Promise<void> {
  return tx(STORE_SPENDING, "readwrite", (store) => store.put(entry)).then(
    () => undefined
  );
}

export function deleteSpendingRecord(id: string): Promise<void> {
  return tx(STORE_SPENDING, "readwrite", (store) => store.delete(id)).then(
    () => undefined
  );
}

// ---- Savings goals ----

export function loadGoals(): Promise<SavingsGoal[]> {
  return getAll<SavingsGoal>(STORE_GOALS);
}

export function putGoal(goal: SavingsGoal): Promise<void> {
  return tx(STORE_GOALS, "readwrite", (store) => store.put(goal)).then(() => undefined);
}

export function deleteGoalRecord(id: string): Promise<void> {
  return tx(STORE_GOALS, "readwrite", (store) => store.delete(id)).then(() => undefined);
}

// ---- Savings transactions (allocations toward a goal — never spending) ----

export function loadSavingsTransactions(): Promise<SavingsTransaction[]> {
  return getAll<SavingsTransaction>(STORE_TRANSACTIONS);
}

export function putSavingsTransaction(txn: SavingsTransaction): Promise<void> {
  return tx(STORE_TRANSACTIONS, "readwrite", (store) => store.put(txn)).then(
    () => undefined
  );
}

export function deleteSavingsTransaction(id: string): Promise<void> {
  return tx(STORE_TRANSACTIONS, "readwrite", (store) => store.delete(id)).then(
    () => undefined
  );
}