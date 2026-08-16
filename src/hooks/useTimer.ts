'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTimerOptions {
  mode: 'stopwatch' | 'countdown';
  /** Only meaningful for countdowns. */
  targetSeconds?: number;
  onFinish?: () => void;
}

/**
 * A timer that keeps wall-clock time rather than counting interval ticks.
 *
 * Browsers throttle (and phones suspend outright) timers belonging to a
 * backgrounded tab, so a tick-counting timer silently loses minutes whenever
 * the screen goes off. Elapsed time is derived from `Date.now()` instead, and
 * re-read whenever the page becomes visible again, so the reading is correct
 * however long the device was asleep.
 */
export function useTimer({ mode, targetSeconds = 0, onFinish }: UseTimerOptions) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  /** Seconds banked by previous runs (i.e. everything before the current start). */
  const bankedRef = useRef(0);
  /** Wall-clock time the current run began, or null when paused/stopped. */
  const startedAtRef = useRef<number | null>(null);

  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const read = useCallback(
    () =>
      startedAtRef.current === null
        ? bankedRef.current
        : bankedRef.current + (Date.now() - startedAtRef.current) / 1000,
    [],
  );

  const sync = useCallback(() => {
    const raw = read();
    if (startedAtRef.current !== null && mode === 'countdown' && raw >= targetSeconds) {
      bankedRef.current = targetSeconds;
      startedAtRef.current = null;
      setIsRunning(false);
      setElapsed(targetSeconds);
      onFinishRef.current?.();
      return;
    }
    setElapsed(Math.floor(raw));
  }, [mode, read, targetSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(sync, 250);
    // A throttled tab may not tick at all; catch up the moment it comes back.
    const onWake = () => sync();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, [isRunning, sync]);

  const start = useCallback(() => {
    if (startedAtRef.current !== null) return;
    if (mode === 'countdown' && bankedRef.current >= targetSeconds) return;
    startedAtRef.current = Date.now();
    setIsRunning(true);
  }, [mode, targetSeconds]);

  const pause = useCallback(() => {
    if (startedAtRef.current === null) return;
    bankedRef.current = read();
    startedAtRef.current = null;
    setIsRunning(false);
    setElapsed(Math.floor(bankedRef.current));
  }, [read]);

  const reset = useCallback(() => {
    bankedRef.current = 0;
    startedAtRef.current = null;
    setIsRunning(false);
    setElapsed(0);
  }, []);

  /** Elapsed whole seconds right now, without waiting for the next tick. */
  const readNow = useCallback(() => Math.floor(read()), [read]);

  const isComplete = mode === 'countdown' && elapsed >= targetSeconds;

  return { elapsed, isRunning, isComplete, start, pause, reset, readNow };
}
