import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore } from '@/lib/localStore';

afterEach(() => localStorage.clear());

const parse = (raw: unknown) => (typeof raw === 'number' ? raw : 0);

describe('get', () => {
  it('returns the fallback when nothing is stored', () => {
    const store = createLocalStore<number>({ key: 'k', parse, fallback: -1 });
    expect(store.get()).toBe(-1);
  });

  it('parses what is stored', () => {
    const store = createLocalStore<number>({ key: 'k', parse, fallback: -1 });
    expect(store.set(7)).toBe(true);
    expect(store.get()).toBe(7);
  });

  it('falls back rather than throwing when the stored JSON is corrupt', () => {
    localStorage.setItem('k', '{not json');
    const store = createLocalStore<number>({ key: 'k', parse, fallback: -1 });
    expect(store.get()).toBe(-1);
  });

  it('falls back rather than throwing when storage itself is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    try {
      const store = createLocalStore<number>({ key: 'k', parse, fallback: -1 });
      expect(store.get()).toBe(-1);
    } finally {
      getItem.mockRestore();
    }
  });
});

describe('update', () => {
  it('applies the reduction to the stored value', async () => {
    const store = createLocalStore<number>({ key: 'k', parse, fallback: 0 });
    await store.update(n => n + 3);
    expect(store.get()).toBe(3);
    // and to whatever a second update reads, not to a stale copy
    await store.update(n => n * 2);
    expect(store.get()).toBe(6);
  });

  it('resolves false when the write is rejected', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    try {
      const store = createLocalStore<number>({ key: 'k', parse, fallback: 0 });
      await expect(store.update(n => n + 1)).resolves.toBe(false);
    } finally {
      setItem.mockRestore();
    }
  });
});

describe('set', () => {
  it('notifies subscribers in this tab, like the storage event does across tabs', () => {
    const store = createLocalStore<number>({ key: 'k', parse, fallback: 0 });
    const seen: number[] = [];
    const unsubscribe = store.subscribe(() => seen.push(store.get()));
    store.set(5);
    unsubscribe();
    store.set(9); // unsubscribed: no longer notified
    expect(seen).toEqual([5]);
  });
});

// The sync engine subscribes to the same store it writes pulled entries into.
// Without this, every sync woke itself up again and never finished.
describe('a write that changes nothing', () => {
  it('does not wake subscribers', () => {
    const store = createLocalStore<number>({ key: 'k', parse: Number, fallback: 0 });
    store.set(7);

    const listener = vi.fn();
    store.subscribe(listener);
    store.set(7);

    expect(listener).not.toHaveBeenCalled();
  });

  it('still wakes them when the value actually changes', () => {
    const store = createLocalStore<number>({ key: 'k', parse: Number, fallback: 0 });
    store.set(7);

    const listener = vi.fn();
    store.subscribe(listener);
    store.set(8);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('reports success, because the stored value is the one asked for', () => {
    const store = createLocalStore<number>({ key: 'k', parse: Number, fallback: 0 });
    store.set(7);
    expect(store.set(7)).toBe(true);
  });
});
