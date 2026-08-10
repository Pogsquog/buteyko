'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { LogEntry } from '../types';

const STORAGE_KEY = 'buteyko_logs';
const EMPTY: LogEntry[] = [];

const listeners = new Set<() => void>();

// getSnapshot runs on every render, so the parsed value is cached and only
// re-parsed when the stored string actually changes — returning a fresh array
// each time would loop React forever.
let cachedRaw: string | null = null;
let cachedLogs: LogEntry[] = EMPTY;

function getLogs(): LogEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedLogs;
  cachedRaw = raw;
  if (!raw) {
    cachedLogs = EMPTY;
  } else {
    try {
      cachedLogs = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse logs', e);
      cachedLogs = EMPTY;
    }
  }
  return cachedLogs;
}

// There is no localStorage while prerendering, so the server snapshot is empty
// and `isLoaded` is false until React has hydrated.
function getEmpty(): LogEntry[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange); // other tabs
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function write(logs: LogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  listeners.forEach(l => l());
}

export const useLogs = () => {
  const logs = useSyncExternalStore(subscribe, getLogs, getEmpty);
  const isLoaded = useSyncExternalStore(subscribe, () => true, () => false);

  const saveLog = useCallback((newLog: LogEntry) => {
    write([newLog, ...getLogs()]);
  }, []);

  const deleteLog = useCallback((id: string) => {
    write(getLogs().filter(log => log.id !== id));
  }, []);

  return { logs, saveLog, deleteLog, isLoaded };
};
