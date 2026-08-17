'use client';

import { useCallback } from 'react';
import { SessionFormat } from '@/types';
import { createLocalStore } from '@/lib/localStore';
import { useLocalStore } from '@/hooks/useLocalStore';
import { clampFormat, DEFAULT_FORMAT } from '@/lib/sessionFormat';

const store = createLocalStore<SessionFormat>({
  key: 'buteyko_format',
  parse: clampFormat,
  fallback: DEFAULT_FORMAT,
});

export const useFormat = () => {
  const [format, isLoaded] = useLocalStore(store);

  const setFormat = useCallback((update: Partial<SessionFormat>) => {
    store.set(clampFormat({ ...store.get(), ...update }));
  }, []);

  const resetFormat = useCallback(() => store.clear(), []);

  return { format, setFormat, resetFormat, isLoaded };
};
