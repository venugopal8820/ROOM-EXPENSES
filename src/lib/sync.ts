// Offline-first sync engine.
// IndexedDB is the source of truth. This module pushes pending changes to Supabase
// when online and pulls remote updates, using updated_at for last-write-wins.

import { supabase, supabaseConfigured } from './supabase';
import * as idb from './idb';
import { LocalExpense, SyncStatus } from '@/types';

type SyncListener = (status: { online: boolean; syncing: boolean; pending: number; failed: number }) => void;

const listeners = new Set<SyncListener>();
let state = { online: navigator.onLine, syncing: false, pending: 0, failed: 0 };
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l({ ...state }));
}

function setState(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export async function refreshStatus() {
  const queue = await idb.getSyncQueue();
  const pending = queue.filter((q) => q.op !== 'delete' || true).length;
  const failed = queue.filter((q) => q.attempts > 0 && q.lastError).length;
  setState({ pending, failed });
}

export async function initSync() {
  window.addEventListener('online', () => {
    setState({ online: true });
    syncNow();
  });
  window.addEventListener('offline', () => {
    setState({ online: false });
  });
  setState({ online: navigator.onLine });
  await refreshStatus();
  if (state.online) syncNow();
}

export async function enqueueAndSync(id: string, op: 'upsert' | 'delete') {
  await idb.upsertQueueItem({ id, op, attempts: 0 });
  await refreshStatus();
  if (state.online) syncNow();
}

export async function syncNow(): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    // No backend - mark everything as "synced" locally (offline-only mode)
    const all = await idb.getAllExpenses();
    for (const e of all) {
      if (e._sync !== 'synced') {
        await idb.putExpense({ ...e, _sync: 'synced' as SyncStatus, _dirty: false });
      }
    }
    await clearQueue();
    await refreshStatus();
    return;
  }

  if (state.syncing || !state.online) return;
  setState({ syncing: true });

  try {
    // 1. Push pending changes
    const queue = await idb.getSyncQueue();
    for (const item of queue) {
      try {
        const local = await idb.getMeta(`expense_${item.id}`).catch(() => null);
        const exp = await getLocalExpense(item.id);
        if (item.op === 'delete') {
          // soft delete remotely
          const { error } = await supabase
            .from('expenses')
            .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', item.id);
          if (error) throw error;
        } else {
          if (!exp) continue;
          const row = {
            id: exp.id,
            description: exp.description,
            amount: exp.amount,
            paid_by: exp.paid_by,
            date: exp.date,
            created_at: exp.created_at,
            updated_at: exp.updated_at,
            deleted_at: exp.deleted_at,
          };
          const { error } = await supabase.from('expenses').upsert(row);
          if (error) throw error;
        }
        await idb.removeQueueItem(item.id);
        if (exp) await idb.putExpense({ ...exp, _sync: 'synced' as SyncStatus, _dirty: false });
      } catch (err: any) {
        await idb.upsertQueueItem({
          ...item,
          attempts: item.attempts + 1,
          lastError: err?.message || 'sync failed',
        });
      }
    }

    // 2. Pull remote updates (last-write-wins by updated_at)
    const lastSync = (await idb.getMeta('lastSync')) as string | null;
    const query = supabase.from('expenses').select('*').order('updated_at', { ascending: true });
    if (lastSync) query.gte('updated_at', lastSync);
    const { data: remote, error } = await query;
    if (error) throw error;

    if (remote && remote.length > 0) {
      const localAll = await idb.getAllExpenses();
      const localMap = new Map(localAll.map((e) => [e.id, e]));
      const toStore: LocalExpense[] = [];
      for (const r of remote) {
        const local = localMap.get(r.id);
        const remoteUpdated = new Date(r.updated_at).getTime();
        const localUpdated = local ? new Date(local.updated_at).getTime() : 0;
        // Only take remote if remote is newer AND local isn't dirty-pending
        if (!local || (!local._dirty && remoteUpdated > localUpdated)) {
          toStore.push({
            id: r.id,
            description: r.description,
            amount: Number(r.amount),
            paid_by: r.paid_by,
            date: r.date,
            created_at: r.created_at,
            updated_at: r.updated_at,
            deleted_at: r.deleted_at,
            _sync: 'synced' as SyncStatus,
            _dirty: false,
          });
        }
      }
      if (toStore.length) await idb.putExpensesBatch(toStore);
      await idb.setMeta('lastSync', new Date().toISOString());
    }

    await refreshStatus();
    scheduleRetryIfNeeded();
  } catch {
    scheduleRetryIfNeeded();
  } finally {
    setState({ syncing: false });
  }
}

async function getLocalExpense(id: string): Promise<LocalExpense | null> {
  const all = await idb.getAllExpenses();
  return all.find((e) => e.id === id) || null;
}

async function clearQueue() {
  const queue = await idb.getSyncQueue();
  for (const q of queue) await idb.removeQueueItem(q.id);
}

function scheduleRetryIfNeeded() {
  if (retryTimer) return;
  refreshStatus().then(() => {
    if (state.failed > 0 || state.pending > 0) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (state.online) syncNow();
      }, 15000);
    }
  });
}
