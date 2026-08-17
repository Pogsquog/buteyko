'use client';

import { useCallback } from 'react';
import { Session } from '@/types';
import { createLocalStore } from '@/lib/localStore';
import { useLocalStore } from '@/hooks/useLocalStore';
import { normalizeSessions } from '@/lib/session';

// Sessions saved before the format became configurable are upgraded on read,
// so old logs keep displaying alongside new ones.
const store = createLocalStore<Session[]>({
  key: 'buteyko_logs',
  parse: normalizeSessions,
  fallback: [],
});

export const useLogs = () => {
  const [logs, isLoaded] = useLocalStore(store);

  /** False if the write was rejected, so the caller can say so rather than pretending. */
  const saveLog = useCallback((session: Session) => store.set([session, ...store.get()]), []);

  const deleteLog = useCallback(
    (id: string) => store.set(store.get().filter(log => log.id !== id)),
    [],
  );

  return { logs, saveLog, deleteLog, isLoaded };
};
