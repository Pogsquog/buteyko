import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGetReady } from '@/hooks/useGetReady';

/**
 * Like useTimer, the lead-in reads the wall clock rather than counting ticks,
 * so the tests move the clock and the ticks separately — including moving the
 * clock a long way with no ticks, which is what a phone locking mid-count
 * looks like.
 */
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useGetReady', () => {
  it('is inactive until begun', () => {
    const onGo = vi.fn();
    const { result } = renderHook(() => useGetReady(3, onGo));

    expect(result.current.remaining).toBeNull();
    expect(onGo).not.toHaveBeenCalled();
  });

  it('counts down 3-2-1 and fires once at zero', async () => {
    const onGo = vi.fn();
    const { result } = renderHook(() => useGetReady(3, onGo));

    act(() => result.current.begin());
    expect(result.current.remaining).toBe(3);

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(result.current.remaining).toBe(2);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(result.current.remaining).toBe(1);
    expect(onGo).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(result.current.remaining).toBeNull();
    expect(onGo).toHaveBeenCalledTimes(1);

    // Well past the end it must not fire again.
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onGo).toHaveBeenCalledTimes(1);
  });

  it('goes on time even when no tick ran (suspended tab)', async () => {
    const onGo = vi.fn();
    const { result } = renderHook(() => useGetReady(3, onGo));

    act(() => result.current.begin());
    // Asleep past the go moment; only one tick lands afterwards.
    vi.setSystemTime(Date.now() + 60_000);
    await act(async () => { vi.advanceTimersByTime(100); });

    expect(onGo).toHaveBeenCalledTimes(1);
    expect(result.current.remaining).toBeNull();
  });

  it('cancel backs out without firing', async () => {
    const onGo = vi.fn();
    const { result } = renderHook(() => useGetReady(3, onGo));

    act(() => result.current.begin());
    await act(async () => { vi.advanceTimersByTime(1000); });
    act(() => result.current.cancel());

    expect(result.current.remaining).toBeNull();

    await act(async () => { vi.advanceTimersByTime(10_000); });
    expect(onGo).not.toHaveBeenCalled();
  });

  it('can be run again after going or cancelling', async () => {
    const onGo = vi.fn();
    const { result } = renderHook(() => useGetReady(1, onGo));

    act(() => result.current.begin());
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(onGo).toHaveBeenCalledTimes(1);

    act(() => result.current.begin());
    expect(result.current.remaining).toBe(1);
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(onGo).toHaveBeenCalledTimes(2);
  });

  it('fires the latest onGo, not the one it was mounted with', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onGo }) => useGetReady(1, onGo),
      { initialProps: { onGo: first } },
    );

    rerender({ onGo: second });
    act(() => result.current.begin());
    await act(async () => { vi.advanceTimersByTime(1500); });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
