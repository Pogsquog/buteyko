import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimer } from '@/hooks/useTimer';

/**
 * The point of this timer is that it reads the wall clock instead of counting
 * ticks, so these tests move the clock and the tick separately — including
 * moving the clock a long way with no ticks at all, which is what a phone
 * locking mid-exercise looks like.
 */
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advances both the clock and the interval, the way real time does. */
const advance = async (seconds: number) => {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000);
  });
};

/** Advances the clock only — no timers fire, as in a suspended tab. */
const sleep = (seconds: number) => {
  vi.setSystemTime(Date.now() + seconds * 1000);
};

describe('useTimer as a stopwatch', () => {
  it('starts at zero and stopped', () => {
    const { result } = renderHook(() => useTimer({ mode: 'stopwatch' }));
    expect(result.current.elapsed).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('counts up in whole seconds while running', async () => {
    const { result } = renderHook(() => useTimer({ mode: 'stopwatch' }));

    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);

    await advance(5);
    expect(result.current.elapsed).toBe(5);
  });

  it('banks time across a pause and resumes from there', async () => {
    const { result } = renderHook(() => useTimer({ mode: 'stopwatch' }));

    act(() => result.current.start());
    await advance(4);
    act(() => result.current.pause());

    expect(result.current.elapsed).toBe(4);
    expect(result.current.isRunning).toBe(false);

    // Time passing while paused must not be counted.
    sleep(60);
    expect(result.current.elapsed).toBe(4);

    act(() => result.current.start());
    await advance(3);
    expect(result.current.elapsed).toBe(7);
  });

  it('reads the truth after a spell with no ticks at all', async () => {
    const { result } = renderHook(() => useTimer({ mode: 'stopwatch' }));

    act(() => result.current.start());
    sleep(600); // screen off for ten minutes; no interval fires

    // The catch-up path: the tab becomes visible and the timer re-reads.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.elapsed).toBe(600);
  });

  it('reports the current time without waiting for the next tick', () => {
    const { result } = renderHook(() => useTimer({ mode: 'stopwatch' }));

    act(() => result.current.start());
    sleep(2.6);

    expect(result.current.readNow()).toBe(2);
    expect(result.current.elapsed).toBe(0); // no tick has landed yet
  });

  it('resets back to zero', async () => {
    const { result } = renderHook(() => useTimer({ mode: 'stopwatch' }));

    act(() => result.current.start());
    await advance(5);
    act(() => result.current.reset());

    expect(result.current.elapsed).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });
});

describe('useTimer as a countdown', () => {
  it('finishes exactly on the target and stops itself', async () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useTimer({ mode: 'countdown', targetSeconds: 15, onFinish }),
    );

    act(() => result.current.start());
    await advance(14);
    expect(result.current.isComplete).toBe(false);
    expect(onFinish).not.toHaveBeenCalled();

    await advance(1);
    expect(result.current.elapsed).toBe(15);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('does not overshoot when the device was asleep past the target', async () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useTimer({ mode: 'countdown', targetSeconds: 60, onFinish }),
    );

    act(() => result.current.start());
    sleep(300); // asleep for five minutes on a one-minute countdown
    await advance(0.25);

    expect(result.current.elapsed).toBe(60);
    expect(result.current.isComplete).toBe(true);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('announces the finish only once', async () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useTimer({ mode: 'countdown', targetSeconds: 5, onFinish }),
    );

    act(() => result.current.start());
    await advance(30);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('refuses to restart once it has run out', async () => {
    const { result } = renderHook(() => useTimer({ mode: 'countdown', targetSeconds: 5 }));

    act(() => result.current.start());
    await advance(6);
    act(() => result.current.start());

    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsed).toBe(5);
  });

  it('keeps the latest onFinish, not the one it was mounted with', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onFinish }) => useTimer({ mode: 'countdown', targetSeconds: 5, onFinish }),
      { initialProps: { onFinish: first } },
    );

    act(() => result.current.start());
    rerender({ onFinish: second });
    await advance(6);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
