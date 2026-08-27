import { ThemeMode, ThemePreference } from '@/types';

/** The two palettes the app actually paints in, once the preference is resolved. */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'buteyko_theme';

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system', 'schedule'];

/**
 * Matching the device is the least surprising starting point: a phone already
 * on its night theme gets one here too, without anyone having to find this
 * setting first.
 */
export const DEFAULT_THEME: ThemePreference = {
  mode: 'system',
  fromHour: 20,
  toHour: 7,
};

/** Colour of the browser/PWA chrome, per palette. */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#2563eb', // blue-600, the app's accent
  dark: '#020617', // slate-950, the dark page background
};

const clampHour = (value: unknown, fallback: number) =>
  Number.isFinite(value) ? Math.min(23, Math.max(0, Math.round(value as number))) : fallback;

/**
 * Takes `unknown` because it is used both on user input and on whatever JSON
 * happens to be in localStorage. Anything missing or unusable falls back to the
 * default rather than failing.
 */
export function clampTheme(preference: unknown): ThemePreference {
  const p = (
    typeof preference === 'object' && preference !== null ? preference : {}
  ) as Partial<ThemePreference>;
  return {
    mode: THEME_MODES.includes(p.mode as ThemeMode) ? (p.mode as ThemeMode) : DEFAULT_THEME.mode,
    fromHour: clampHour(p.fromHour, DEFAULT_THEME.fromHour),
    toHour: clampHour(p.toHour, DEFAULT_THEME.toHour),
  };
}

/**
 * Whether `hour` falls in the dark window. The window usually wraps around
 * midnight (20:00 → 07:00), so it is "from or after the start, or before the
 * end" whenever the start is the later of the two.
 *
 * A window that starts and ends at the same hour covers nothing: the settings
 * screen says as much rather than guessing that a whole day was meant.
 */
export function isNightHour(hour: number, fromHour: number, toHour: number): boolean {
  if (fromHour === toHour) return false;
  return fromHour < toHour
    ? hour >= fromHour && hour < toHour
    : hour >= fromHour || hour < toHour;
}

interface ThemeContext {
  /** Hour of the day, 0–23, in the device's own timezone. */
  hour: number;
  /** Whether the device asks for a dark colour scheme. */
  prefersDark: boolean;
}

/** The palette to paint, given the preference and the world around it. */
export function resolveTheme(preference: ThemePreference, { hour, prefersDark }: ThemeContext): Theme {
  switch (preference.mode) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    case 'schedule':
      return isNightHour(hour, preference.fromHour, preference.toHour) ? 'dark' : 'light';
    case 'system':
      return prefersDark ? 'dark' : 'light';
  }
}

/**
 * Milliseconds until the clock next strikes the hour — the next moment a
 * scheduled theme can change. Derived from the local wall clock rather than
 * the epoch, because not every timezone's hour starts when UTC's does.
 */
export function msUntilNextHour(now: number): number {
  const HOUR = 60 * 60 * 1000;
  const date = new Date(now);
  const intoTheHour =
    date.getMinutes() * 60_000 + date.getSeconds() * 1_000 + date.getMilliseconds();
  return HOUR - intoTheHour;
}

/** "20:00" — the schedule is set and read in whole hours. */
export function fmtHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
