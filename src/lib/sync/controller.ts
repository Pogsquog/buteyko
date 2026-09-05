'use client';

import { SupabaseClient } from '@supabase/supabase-js';
import { logStore } from '@/hooks/useLogs';
import { getSupabase } from '@/lib/supabase/client';
import { syncNow } from '@/lib/sync/engine';
import { metaStore } from '@/lib/sync/meta';

/** What the last attempt did. */
export type RunState = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncSnapshot {
  runState: RunState;
  error: string | null;
  lastSyncedAt: number | null;
}

/**
 * One sync for the whole app, not one per screen.
 *
 * The state lives at module scope for the same reason the log store does: the
 * work is a property of the device, not of whichever component happens to be on
 * screen. Syncing must carry on while the user is logging a session, and the
 * account screen has to report what that shared work is doing rather than
 * starting a second copy of it.
 */
let snapshot: SyncSnapshot = { runState: 'idle', error: null, lastSyncedAt: null };

/** Stable, because `useSyncExternalStore` compares by identity every render. */
const SERVER_SNAPSHOT: SyncSnapshot = { runState: 'idle', error: null, lastSyncedAt: null };

const listeners = new Set<() => void>();

export function subscribeSync(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export const getSyncSnapshot = () => snapshot;
export const getSyncServerSnapshot = () => SERVER_SNAPSHOT;

function update(patch: Partial<SyncSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(listener => listener());
}

// Two syncs at once would race each other's cursor writes for no benefit.
let running = false;
// Something changed while a sync was in flight. Without this, an entry saved
// mid-sync would sit on the device until the app was next backgrounded.
let again = false;

export async function runSync(userId: string): Promise<void> {
  const supabase: SupabaseClient | null = getSupabase();
  if (!supabase) return;
  if (running) {
    again = true;
    return;
  }
  // The claim may have been made moments ago; read it rather than trusting a
  // caller's snapshot of it.
  if (metaStore.get().userId !== userId) return;

  running = true;
  try {
    // Loops rather than recurses, so a change that lands mid-sync is picked up
    // on the next pass instead of being dropped.
    do {
      again = false;
      update({ runState: 'syncing' });
      try {
        await syncNow(supabase, userId);
        update({ runState: 'idle', error: null, lastSyncedAt: Date.now() });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        // Being offline is the ordinary state of a PWA, not a fault: the
        // entries are safe on the device and go up on their own. Say so
        // differently, and do not keep retrying into a dead network.
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        update({
          runState: isOffline ? 'offline' : 'error',
          error: isOffline ? null : message,
        });
        break;
      }
    } while (again);
  } finally {
    running = false;
  }
}

/**
 * Starts syncing on the events worth syncing on, and returns the way to stop.
 *
 * No realtime subscription: these cover a personal tracker, and they keep
 * working with the tab asleep for hours.
 */
export function attachSyncTriggers(userId: string): () => void {
  const run = () => void runSync(userId);
  run();

  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', run);
  const unsubscribe = logStore.subscribe(run);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', run);
    unsubscribe();
  };
}

/** Forgets the last outcome, so a signed-out screen does not show a stale one. */
export function resetSyncSnapshot() {
  update({ runState: 'idle', error: null, lastSyncedAt: null });
}
