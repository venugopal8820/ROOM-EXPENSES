// Data access hook - IndexedDB is source of truth. CRUD operations write locally
// then enqueue sync. Testing mode uses isolated in-memory data.

import { useCallback, useEffect, useState } from 'react';
import { LocalExpense, MemberName, MEMBERS, SyncStatus } from '@/types';
import * as idb from './idb';
import { enqueueAndSync, initSync, refreshStatus, subscribeSync, syncNow } from './sync';

const TEST_STORAGE_KEY = 'room-expenses-test-data';
const TEST_MODE_KEY = 'room-expenses-test-mode';

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function isTestMode(): boolean {
  return localStorage.getItem(TEST_MODE_KEY) === '1';
}

export interface ExpenseInput {
  description: string;
  amount: number;
  paid_by: MemberName;
  date: string;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState({ online: true, syncing: false, pending: 0, failed: 0 });

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let active = true;
    (async () => {
      unsub = subscribeSync((s) => active && setSyncState(s));
      await initSync();
      await loadExpenses();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExpenses = useCallback(async () => {
    if (isTestMode()) {
      const data = localStorage.getItem(TEST_STORAGE_KEY);
      const parsed: LocalExpense[] = data ? JSON.parse(data) : [];
      parsed.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
      setExpenses(parsed);
      return;
    }
    const all = await idb.getAllExpenses();
    all.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    setExpenses(all);
  }, []);

  const persistTest = useCallback((data: LocalExpense[]) => {
    localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const addExpense = useCallback(
    async (input: ExpenseInput): Promise<LocalExpense> => {
      const now = new Date().toISOString();
      const exp: LocalExpense = {
        id: uuid(),
        description: input.description,
        amount: input.amount,
        paid_by: input.paid_by,
        date: input.date,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        _sync: 'pending' as SyncStatus,
        _dirty: true,
      };
      if (isTestMode()) {
        const data = [...expenses, exp];
        persistTest(data);
        setExpenses(sortExpenses(data));
        return exp;
      }
      await idb.putExpense(exp);
      await enqueueAndSync(exp.id, 'upsert');
      await loadExpenses();
      return exp;
    },
    [expenses, persistTest, loadExpenses]
  );

  const updateExpense = useCallback(
    async (id: string, input: ExpenseInput): Promise<void> => {
      const now = new Date().toISOString();
      if (isTestMode()) {
        const data = expenses.map((e) =>
          e.id === id ? { ...e, ...input, updated_at: now, _sync: 'pending' as SyncStatus, _dirty: true } : e
        );
        persistTest(data);
        setExpenses(sortExpenses(data));
        return;
      }
      const existing = (await idb.getAllExpenses()).find((e) => e.id === id);
      if (!existing) return;
      const updated: LocalExpense = {
        ...existing,
        ...input,
        updated_at: now,
        _sync: 'pending' as SyncStatus,
        _dirty: true,
      };
      await idb.putExpense(updated);
      await enqueueAndSync(id, 'upsert');
      await loadExpenses();
    },
    [expenses, persistTest, loadExpenses]
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      if (isTestMode()) {
        const data = expenses.map((e) =>
          e.id === id ? { ...e, deleted_at: new Date().toISOString(), _sync: 'pending' as SyncStatus, _dirty: true } : e
        );
        persistTest(data);
        setExpenses(sortExpenses(data));
        return;
      }
      const existing = (await idb.getAllExpenses()).find((e) => e.id === id);
      if (!existing) return;
      const updated: LocalExpense = {
        ...existing,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _sync: 'pending' as SyncStatus,
        _dirty: true,
      };
      await idb.putExpense(updated);
      await enqueueAndSync(id, 'delete');
      await loadExpenses();
    },
    [expenses, persistTest, loadExpenses]
  );

  return {
    expenses: expenses.filter((e) => !e.deleted_at),
    allExpenses: expenses,
    loading,
    syncState,
    addExpense,
    updateExpense,
    deleteExpense,
    reload: loadExpenses,
    syncNow: async () => {
      await syncNow();
      await refreshStatus();
      await loadExpenses();
    },
  };
}

function sortExpenses(data: LocalExpense[]): LocalExpense[] {
  return [...data].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}

export function toggleTestMode(on: boolean) {
  if (on) {
    localStorage.setItem(TEST_MODE_KEY, '1');
  } else {
    localStorage.removeItem(TEST_MODE_KEY);
  }
  window.location.reload();
}

export function isTestingMode(): boolean {
  return isTestMode();
}

export function clearTestData() {
  localStorage.removeItem(TEST_STORAGE_KEY);
}
