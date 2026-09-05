'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStore } from '@/hooks/useLocalStore';
import { claimFor } from '@/lib/sync/engine';
import { metaStore } from '@/lib/sync/meta';
import { attachSyncTriggers, resetSyncSnapshot } from '@/lib/sync/controller';

/**
 * Drives syncing for the whole app. Renders nothing.
 *
 * Mounted in the root layout rather than on the account screen, because a
 * reading logged on any screen — or a deletion made in the history — has to go
 * up when it happens, not the next time somebody opens Settings.
 */
export function SyncController() {
  const { status, user } = useAuth();
  const [meta] = useLocalStore(metaStore);

  const userId = status === 'signedIn' ? (user?.id ?? null) : null;
  const claimed = userId !== null && meta.userId === userId;

  // The first sign-in on a device with no sync history claims what is already
  // here. That is what uploads an existing user's whole history, and it is why
  // upgrading loses nothing: the entries were never anywhere else to begin with.
  useEffect(() => {
    if (userId && meta.userId === null) void claimFor(userId);
  }, [userId, meta.userId]);

  useEffect(() => {
    if (!claimed) {
      resetSyncSnapshot();
      return;
    }
    return attachSyncTriggers(userId);
  }, [claimed, userId]);

  return null;
}
