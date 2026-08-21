// IndexedDB wrapper - the local source of truth for the offline-first app.

const DB_NAME = 'room-expenses';
const DB_VERSION = 1;
const STORE_EXPENSES = 'expenses';
const STORE_META = 'meta';
const STORE_QUEUE = 'syncQueue';

export interface SyncQueueItem {
  id: string; // expense id
  op: 'upsert' | 'delete';
  attempts: number;
  lastError?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
        db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ---- Expenses ----
export async function getAllExpenses(): Promise<any[]> {
  return tx<any[]>(STORE_EXPENSES, 'readonly', (s) => s.getAll() as IDBRequest<any[]>);
}

export async function putExpense(exp: any): Promise<void> {
  await tx(STORE_EXPENSES, 'readwrite', (s) => s.put(exp));
}

export async function putExpensesBatch(exps: any[]): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_EXPENSES, 'readwrite');
    const store = t.objectStore(STORE_EXPENSES);
    exps.forEach((e) => store.put(e));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function deleteExpenseLocal(id: string): Promise<void> {
  await tx(STORE_EXPENSES, 'readwrite', (s) => s.delete(id));
}

// ---- Meta ----
export async function getMeta(key: string): Promise<any> {
  return tx<any>(STORE_META, 'readonly', (s) => s.get(key) as IDBRequest<any>);
}

export async function setMeta(key: string, value: any): Promise<void> {
  await tx(STORE_META, 'readwrite', (s) => s.put(value, key));
}

// ---- Sync Queue ----
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return tx<SyncQueueItem[]>(STORE_QUEUE, 'readonly', (s) =>
    s.getAll() as IDBRequest<SyncQueueItem[]>
  );
}

export async function upsertQueueItem(item: SyncQueueItem): Promise<void> {
  await tx(STORE_QUEUE, 'readwrite', (s) => s.put(item));
}

export async function removeQueueItem(id: string): Promise<void> {
  await tx(STORE_QUEUE, 'readwrite', (s) => s.delete(id));
}
