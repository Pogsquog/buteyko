'use client';

/**
 * A localStorage-backed store shaped for `useSyncExternalStore`.
 *
 * Two things make this fiddlier than a plain getItem/setItem pair, and both are
 * why it lives here instead of being written out per hook:
 *
 *  - `getSnapshot` runs on every render, so the parsed value is cached and only
 *    re-parsed when the stored string actually changes. Returning a fresh
 *    object each time would loop React forever.
 *  - There is no localStorage while prerendering, so the server snapshot is a
 *    constant and `isLoaded` stays false until React has hydrated.
 */
export interface LocalStore<T> {
  subscribe: (onChange: () => void) => () => void;
  get: () => T;
  getServerSnapshot: () => T;
  /** Returns false if the write was rejected (quota exhausted, private mode). */
  set: (value: T) => boolean;
  /**
   * Read-modify-write, serialised against other tabs where the browser
   * supports the Web Locks API. Resolves false if the write was rejected.
   */
  update: (reduce: (value: T) => T) => Promise<boolean>;
  clear: () => void;
}

interface LocalStoreOptions<T> {
  key: string;
  /** Turns stored JSON into a value. Never called with `null`. */
  parse: (raw: unknown) => T;
  /** Used before hydration, when nothing is stored, and when parsing fails. */
  fallback: T;
}

export function createLocalStore<T>({ key, parse, fallback }: LocalStoreOptions<T>): LocalStore<T> {
  const listeners = new Set<() => void>();

  let cachedRaw: string | null = null;
  let cached: T = fallback;

  const get = (): T => {
    let raw: string | null = null;
    let unreadable = false;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      // Storage can throw, not just fail to write: browsers set to block all
      // cookies refuse the property access itself. Degrade to the fallback
      // rather than crashing every screen that reads during render.
      console.error(`Failed to read ${key}`, e);
      unreadable = true;
    }
    // A failed read must not be confused with a successful one that returned
    // the same string as last time.
    if (!unreadable && raw === cachedRaw) return cached;
    cachedRaw = raw;
    if (unreadable || !raw) {
      cached = fallback;
    } else {
      try {
        cached = parse(JSON.parse(raw));
      } catch (e) {
        console.error(`Failed to parse ${key}`, e);
        cached = fallback;
      }
    }
    return cached;
  };

  const notify = () => listeners.forEach(l => l());

  const write = (value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Safari's private mode and a full quota both throw here. Callers need
      // to know, because a session that failed to save must not look saved.
      console.error(`Failed to save ${key}`, e);
      return false;
    }
    notify();
    return true;
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      window.addEventListener('storage', onChange); // other tabs
      return () => {
        listeners.delete(onChange);
        window.removeEventListener('storage', onChange);
      };
    },

    get,

    getServerSnapshot: () => fallback,

    set(value) {
      return write(value);
    },

    // The read-modify-write pair is synchronous within a tab, but two tabs
    // run in parallel processes and can interleave mid-update, each writing
    // against the same original value and losing the other's change. Where
    // the Web Locks API exists, take a per-key lock across the whole update;
    // otherwise fall through to an unlocked write.
    async update(reduce) {
      const apply = () => write(reduce(get()));
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return navigator.locks.request(`buteyko-${key}`, apply);
      }
      return apply();
    },

    clear() {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to clear ${key}`, e);
      }
      notify();
    },
  };
}
