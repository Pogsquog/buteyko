'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { SessionFormat } from '@/types';
import { clampFormat, DEFAULT_FORMAT } from '@/lib/format';

const STORAGE_KEY = 'buteyko_format';

const listeners = new Set<() => void>();

// getSnapshot runs on every render, so the parsed value is cached and only
// re-parsed when the stored string actually changes — returning a fresh object
// each time would loop React forever.
let cachedRaw: string | null = null;
let cachedFormat: SessionFormat = DEFAULT_FORMAT;

function getFormat(): SessionFormat {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedFormat;
  cachedRaw = raw;
  if (!raw) {
    cachedFormat = DEFAULT_FORMAT;
  } else {
    try {
      cachedFormat = clampFormat(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to parse format', e);
      cachedFormat = DEFAULT_FORMAT;
    }
  }
  return cachedFormat;
}

// There is no localStorage while prerendering, so the server snapshot is the
// default and `isLoaded` is false until React has hydrated.
function getDefault(): SessionFormat {
  return DEFAULT_FORMAT;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange); // other tabs
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export const useFormat = () => {
  const format = useSyncExternalStore(subscribe, getFormat, getDefault);
  const isLoaded = useSyncExternalStore(subscribe, () => true, () => false);

  const setFormat = useCallback((update: Partial<SessionFormat>) => {
    const next = clampFormat({ ...getFormat(), ...update });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    listeners.forEach(l => l());
  }, []);

  const resetFormat = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach(l => l());
  }, []);

  return { format, setFormat, resetFormat, isLoaded };
};
