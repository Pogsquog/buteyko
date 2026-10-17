'use client';

import { useCallback } from 'react';
import { createLocalStore } from '@/lib/localStore';
import { useLocalStore } from '@/hooks/useLocalStore';
import { clampPulseLeadIn, DEFAULT_PULSE_LEAD_IN } from '@/lib/pulseLeadIn';

const store = createLocalStore<number>({
  key: 'buteyko_pulse_lead_in',
  parse: clampPulseLeadIn,
  fallback: DEFAULT_PULSE_LEAD_IN,
});

/** Seconds of countdown before a hand-counted pulse begins. */
export const usePulseLeadIn = () => {
  const [leadIn, isLoaded] = useLocalStore(store);

  const setLeadIn = useCallback((seconds: number) => {
    store.set(clampPulseLeadIn(seconds));
  }, []);

  return { leadIn, setLeadIn, isLoaded };
};
