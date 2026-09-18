import type { ActivityEvent, AppSettings, Report } from "../types";

const DB_NAME = "qms-work-monitor";
const DB_VERSION = 1;
const STORE_REPORTS = "reports";
const STORE_ACTIVITY = "activity";
const STORE_SETTINGS = "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVITY)) {
        db.createObjectStore(STORE_ACTIVITY, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
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

// ---- Reports ----

export function loadReports(): Promise<Report[]> {
  return getAll<Report>(STORE_REPORTS);
}

export function putReport(report: Report): Promise<void> {
  return tx(STORE_REPORTS, "readwrite", (store) => store.put(report)).then(
    () => undefined
  );
}

export function deleteReportRecord(id: string): Promise<void> {
  return tx(STORE_REPORTS, "readwrite", (store) => store.delete(id)).then(
    () => undefined
  );
}

export function putAllReports(reports: Report[]): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_REPORTS, "readwrite");
        const store = transaction.objectStore(STORE_REPORTS);
        store.clear();
        reports.forEach((r) => store.put(r));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Activity ----

export function loadActivity(): Promise<ActivityEvent[]> {
  return getAll<ActivityEvent>(STORE_ACTIVITY);
}

export function putActivityEvent(event: ActivityEvent): Promise<void> {
  return tx(STORE_ACTIVITY, "readwrite", (store) => store.put(event)).then(
    () => undefined
  );
}

export function putAllActivity(events: ActivityEvent[]): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_ACTIVITY, "readwrite");
        const store = transaction.objectStore(STORE_ACTIVITY);
        store.clear();
        events.forEach((e) => store.put(e));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Settings ----

export function loadSettings(): Promise<AppSettings | null> {
  return tx<{ key: string; value: AppSettings } | undefined>(
    STORE_SETTINGS,
    "readonly",
    (store) => store.get("app-settings")
  ).then((row) => row?.value ?? null);
}

export function putSettings(settings: AppSettings): Promise<void> {
  return tx(STORE_SETTINGS, "readwrite", (store) =>
    store.put({ key: "app-settings", value: settings })
  ).then(() => undefined);
}

// ---- Danger zone ----

export function clearAllData(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          [STORE_REPORTS, STORE_ACTIVITY, STORE_SETTINGS],
          "readwrite"
        );
        transaction.objectStore(STORE_REPORTS).clear();
        transaction.objectStore(STORE_ACTIVITY).clear();
        transaction.objectStore(STORE_SETTINGS).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}
