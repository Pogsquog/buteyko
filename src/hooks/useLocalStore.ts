'use client';

import { useSyncExternalStore } from 'react';
import { LocalStore } from '@/lib/localStore';

const alwaysTrue = () => true;
const alwaysFalse = () => false;

/**
 * Subscribes to a `LocalStore`, returning its value and whether that value is
 * the real stored one yet. Before hydration it is the store's fallback, because
 * there is no localStorage on the server — screens use `isLoaded` to avoid
 * showing defaults as though they were the user's own settings.
 */
export function useLocalStore<T>(store: LocalStore<T>): [value: T, isLoaded: boolean] {
  const value = useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
  const isLoaded = useSyncExternalStore(store.subscribe, alwaysTrue, alwaysFalse);
  return [value, isLoaded];
}
