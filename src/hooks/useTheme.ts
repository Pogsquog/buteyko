'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ThemePreference } from '@/types';
import { createLocalStore } from '@/lib/localStore';
import { useLocalStore } from '@/hooks/useLocalStore';
import {
  clampTheme,
  DEFAULT_THEME,
  msUntilNextHour,
  resolveTheme,
  Theme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from '@/lib/theme';

const store = createLocalStore<ThemePreference>({
  key: THEME_STORAGE_KEY,
  parse: clampTheme,
  fallback: DEFAULT_THEME,
});

const DARK_QUERY = '(prefers-color-scheme: dark)';

const subscribeToDeviceTheme = (onChange: () => void) => {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const readDeviceTheme = () => window.matchMedia(DARK_QUERY).matches;

/** Whether the device asks for a dark colour scheme. False while prerendering. */
function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribeToDeviceTheme, readDeviceTheme, () => false);
}

/**
 * The current hour, re-read when it changes.
 *
 * A scheduled theme only turns over on the hour, so rather than polling, the
 * next read is booked for the moment the clock strikes. A sleeping device
 * fires that late (or not at all until it wakes), so returning to the app
 * re-reads the clock too.
 */
function useCurrentHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      setHour(new Date().getHours());
      // +1s of slack: a timer firing a hair early would otherwise re-read the
      // same hour and book a full hour's wait from just before the boundary.
      timeout = setTimeout(tick, msUntilNextHour(Date.now()) + 1_000);
    };
    tick();

    const onWake = () => {
      clearTimeout(timeout);
      tick();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);

  return hour;
}

/**
 * The stored appearance preference, and the palette it currently resolves to.
 *
 * `isLoaded` is false until localStorage has been read: the preference has to
 * come back before anything acts on it, or a stored "always dark" would be
 * briefly overruled by the default.
 */
export function useTheme() {
  const [preference, isLoaded] = useLocalStore(store);
  const prefersDark = usePrefersDark();
  const hour = useCurrentHour();

  const theme: Theme = resolveTheme(preference, { hour, prefersDark });

  const setTheme = useCallback((update: Partial<ThemePreference>) => {
    store.set(clampTheme({ ...store.get(), ...update }));
  }, []);

  return { preference, theme, setTheme, isLoaded };
}

/**
 * Paints the resolved theme onto the document: the `dark` class every `dark:`
 * utility keys off, the `color-scheme` that tells the browser how to draw
 * scrollbars and form controls, and the colour of the browser/PWA chrome.
 *
 * The same work is done before first paint by `THEME_SCRIPT`; this keeps it
 * true afterwards, as the preference, the device or the hour changes.
 */
export function useApplyTheme(theme: Theme, isLoaded: boolean) {
  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme, isLoaded]);
}
