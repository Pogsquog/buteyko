'use client';

import { useCallback } from 'react';
import { LogEntry } from '@/types';
import { createLocalStore } from '@/lib/localStore';
import { useLocalStore } from '@/hooks/useLocalStore';
import { normalizeEntries } from '@/lib/session';

// Sessions saved before the format became configurable — and before lone CP
// and RB readings existed — are upgraded on read, so old logs keep displaying
// alongside new ones.
const store = createLocalStore<LogEntry[]>({
  key: 'buteyko_logs',
  parse: normalizeEntries,
  fallback: [],
});

export const useLogs = () => {
  const [logs, isLoaded] = useLocalStore(store);

  /** Resolves false if the write was rejected, so the caller can say so rather than pretending. */
  const saveLog = useCallback((entry: LogEntry) => store.update(logs => [entry, ...logs]), []);

  const deleteLog = useCallback(
    (id: string) => store.update(logs => logs.filter(log => log.id !== id)),
    [],
  );

  return { logs, saveLog, deleteLog, isLoaded };
};
