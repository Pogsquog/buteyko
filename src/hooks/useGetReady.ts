'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A counted lead-in for a timer whose start needs hands-on preparation —
 * fingers on the wrist for a pulse — so the user can put the device down
 * before the timing actually begins.
 *
 * Wall-clock based like useTimer: what matters is when "go" happens, not that
 * every tick lands, so a throttled or suspended tab still releases on time.
 */
export function useGetReady(seconds: number, onGo: () => void) {
  /** Seconds left, or null while inactive. */
  const [remaining, setRemaining] = useState<number | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const onGoRef = useRef(onGo);
  useEffect(() => {
    onGoRef.current = onGo;
  }, [onGo]);

  const begin = useCallback(() => {
    endsAtRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
  }, [seconds]);

  /** Back out without starting anything. */
  const cancel = useCallback(() => {
    endsAtRef.current = null;
    setRemaining(null);
  }, []);

  useEffect(() => {
    if (remaining === null) return;
    // Each tick re-reads the wall clock rather than decrementing a counter,
    // so backgrounded throttling delays the displayed number, never the go.
    const id = setInterval(() => {
      // The interval survives until React re-renders and cleans up; without
      // this guard every tick in that gap would fire onGo again.
      if (endsAtRef.current === null) return;
      const left = Math.ceil((endsAtRef.current - Date.now()) / 1000);
      if (left <= 0) {
        endsAtRef.current = null;
        setRemaining(null);
        onGoRef.current();
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => clearInterval(id);
  }, [remaining]);

  return { remaining, begin, cancel };
}
