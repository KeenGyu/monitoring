import type { Expense, SalaryConfig } from "../types.salary";
import { DEFAULT_SALARY_CONFIG } from "../types.salary";

// Separate IndexedDB database from db.ts, so adding the salary tracker
// never touches (or risks) your existing reports/activity/absentees data.

const DB_NAME = "qms-work-monitor-salary";
const DB_VERSION = 1;
const STORE_EXPENSES = "expenses";
const STORE_CONFIG = "config";

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
  ).then((row) => row?.value ?? DEFAULT_SALARY_CONFIG);
}

export function putSalaryConfig(config: SalaryConfig): Promise<void> {
  return tx(STORE_CONFIG, "readwrite", (store) =>
    store.put({ key: "salary-config", value: config })
  ).then(() => undefined);
}

// ---- Expenses ----

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