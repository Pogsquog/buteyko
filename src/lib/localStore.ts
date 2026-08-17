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
    const raw = localStorage.getItem(key);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    if (!raw) {
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

    // Safari's private mode and a full quota both throw here. Callers need to
    // know, because a session that failed to save must not look saved.
    set(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Failed to save ${key}`, e);
        return false;
      }
      notify();
      return true;
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
