'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStore } from '@/hooks/useLocalStore';
import { logStore } from '@/hooks/useLogs';
import { claimFor, claimWithoutLocal } from '@/lib/sync/engine';
import { metaStore } from '@/lib/sync/meta';
import {
  getSyncServerSnapshot,
  getSyncSnapshot,
  runSync,
  subscribeSync,
} from '@/lib/sync/controller';

export type SyncState =
  /** Not signed in, or no project in this build. The app is local-only. */
  | 'off'
  /** Signed in, but this device's history belongs to a different account. */
  | 'needsDecision'
  | 'idle'
  | 'syncing'
  | 'offline'
  | 'error';

export interface Sync {
  state: SyncState;
  error: string | null;
  lastSyncedAt: number | null;
  syncNow: () => void;
  /** Answers `needsDecision`: fold this device's history into the new account. */
  uploadLocal: () => void;
  /** Answers `needsDecision`: leave it on the device, out of the new account. */
  keepLocalOnly: () => void;
}

/**
 * Reports on the app-wide sync and offers the buttons that steer it.
 *
 * Read-only as far as the syncing itself goes: the effects that drive it belong
 * to `SyncController`, mounted once in the root layout, so that a sync is not
 * tied to whichever screen the user happens to be looking at.
 */
export function useSync(): Sync {
  const { status, user } = useAuth();
  const [meta] = useLocalStore(metaStore);
  const { runState, error, lastSyncedAt } = useSyncExternalStore(
    subscribeSync,
    getSyncSnapshot,
    getSyncServerSnapshot,
  );

  const userId = status === 'signedIn' ? (user?.id ?? null) : null;
  const needsDecision = userId !== null && meta.userId !== null && meta.userId !== userId;

  const uploadLocal = useCallback(() => {
    if (userId) void claimFor(userId);
  }, [userId]);

  const keepLocalOnly = useCallback(() => {
    if (userId) void claimWithoutLocal(userId, logStore.get());
  }, [userId]);

  const syncNow = useCallback(() => {
    if (userId) void runSync(userId);
  }, [userId]);

  // Derived, not stored: signing out or in changes what the state *is*, and an
  // effect mirroring one piece of state into another only invites them to drift.
  const state: SyncState = userId === null ? 'off' : needsDecision ? 'needsDecision' : runState;

  return {
    state,
    error: state === 'off' ? null : error,
    lastSyncedAt,
    syncNow,
    uploadLocal,
    keepLocalOnly,
  };
}
