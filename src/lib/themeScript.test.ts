import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemePreference } from '@/types';
import {
  DEFAULT_THEME,
  resolveTheme,
  THEME_COLORS,
  THEME_MODES,
  THEME_STORAGE_KEY,
} from '@/lib/theme';
import { THEME_SCRIPT } from '@/lib/themeScript';

/**
 * `THEME_SCRIPT` is the one copy of `resolveTheme` written by hand, because it
 * has to run as a string before the app loads. These tests run the real script
 * in a document and hold it to what `resolveTheme` says, so the copy cannot
 * quietly drift from the original.
 */

const runScript = () => new Function(THEME_SCRIPT)();

const setDeviceDark = (prefersDark: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: prefersDark && query.includes('dark'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

const setClock = (hour: number) => vi.setSystemTime(new Date(2026, 7, 27, hour, 30));

const store = (preference: unknown) =>
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));

/** What the script did to the document. */
const applied = () => ({
  isDark: document.documentElement.classList.contains('dark'),
  colorScheme: document.documentElement.style.colorScheme,
  themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
  document.head.innerHTML = '';
  setDeviceDark(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('THEME_SCRIPT', () => {
  it('agrees with resolveTheme for every mode, hour and device setting', () => {
    const preference: ThemePreference = { mode: 'schedule', fromHour: 20, toHour: 7 };

    for (const mode of THEME_MODES) {
      for (const prefersDark of [false, true]) {
        for (let hour = 0; hour < 24; hour++) {
          store({ ...preference, mode });
          setDeviceDark(prefersDark);
          setClock(hour);
          runScript();

          const expected = resolveTheme({ ...preference, mode }, { hour, prefersDark });
          expect(applied().isDark, `${mode} at ${hour}:30, device dark=${prefersDark}`).toBe(
            expected === 'dark',
          );
        }
      }
    }
  });

  it('falls back to the default preference when nothing is stored', () => {
    setDeviceDark(true);
    runScript();
    // The default is "match device", so a dark device is honoured on first run.
    expect(applied().isDark).toBe(resolveTheme(DEFAULT_THEME, { hour: 12, prefersDark: true }) === 'dark');
  });

  it.each([
    ['not JSON at all', 'not json'],
    ['JSON that is not an object', '42'],
    ['an unknown mode', '{"mode":"midnight"}'],
    ['hours that are not numbers', '{"mode":"schedule","fromHour":"late","toHour":null}'],
  ])('survives %s', (_name, raw) => {
    localStorage.setItem(THEME_STORAGE_KEY, raw);
    setDeviceDark(true);
    expect(() => runScript()).not.toThrow();
    expect(applied().isDark).toBe(true); // fell back to matching the device
  });

  it('clamps a stored schedule the same way clampTheme does', () => {
    store({ mode: 'schedule', fromHour: 19.6, toHour: -4 });
    setClock(21); // inside 20:00 → 00:00 once the hours are rounded and clamped
    runScript();
    expect(applied().isDark).toBe(true);

    setClock(3);
    runScript();
    expect(applied().isDark).toBe(false);
  });

  it('tells the browser which scheme to draw its own furniture in', () => {
    store({ mode: 'dark' });
    runScript();
    expect(applied().colorScheme).toBe('dark');

    store({ mode: 'light' });
    runScript();
    expect(applied().colorScheme).toBe('light');
  });

  it('paints the browser chrome, creating the meta tag if the head has none', () => {
    store({ mode: 'dark' });
    runScript();
    expect(applied().themeColor).toBe(THEME_COLORS.dark);
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  });

  it('repaints the meta tag the document already has, rather than adding another', () => {
    document.head.innerHTML = `<meta name="theme-color" content="${THEME_COLORS.light}">`;
    store({ mode: 'dark' });
    runScript();
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(applied().themeColor).toBe(THEME_COLORS.dark);
  });

  it('still themes the page when storage cannot be read at all', () => {
    // Browsers set to block all site data throw on the property access itself.
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    setDeviceDark(true);
    expect(() => runScript()).not.toThrow();
    expect(applied().isDark).toBe(true); // the default preference still applies
    getItem.mockRestore();
  });
});
