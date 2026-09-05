'use client';

import { useCallback, useMemo } from 'react';
import { LogEntry, NewLogEntry } from '@/types';
import { createLocalStore } from '@/lib/localStore';
import { useLocalStore } from '@/hooks/useLocalStore';
import { normalizeEntries } from '@/lib/session';

// Sessions saved before the format became configurable — and before lone CP
// and RB readings existed, and before sync added `updatedAt`/`deletedAt` — are
// upgraded on read, so old logs keep displaying alongside new ones.
export const logStore = createLocalStore<LogEntry[]>({
  key: 'buteyko_logs',
  parse: normalizeEntries,
  fallback: [],
});

export const useLogs = () => {
  const [stored, isLoaded] = useLocalStore(logStore);

  // Deleted entries stay in storage as tombstones so the deletion can reach the
  // user's other devices. Nothing outside the sync engine should ever see them.
  const logs = useMemo(() => stored.filter(log => log.deletedAt === null), [stored]);

  /** Resolves false if the write was rejected, so the caller can say so rather than pretending. */
  const saveLog = useCallback(
    (entry: NewLogEntry) =>
      logStore.update(logs => [{ ...entry, updatedAt: Date.now(), deletedAt: null }, ...logs]),
    [],
  );

  const deleteLog = useCallback(
    (id: string) =>
      logStore.update(logs => {
        const now = Date.now();
        return logs.map(log =>
          log.id === id ? { ...log, deletedAt: now, updatedAt: now } : log,
        );
      }),
    [],
  );

  return { logs, saveLog, deleteLog, isLoaded };
};
