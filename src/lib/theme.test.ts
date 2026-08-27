import { describe, expect, it } from 'vitest';
import { ThemePreference } from '@/types';
import {
  clampTheme,
  DEFAULT_THEME,
  fmtHour,
  isNightHour,
  msUntilNextHour,
  resolveTheme,
} from '@/lib/theme';

const pref = (patch: Partial<ThemePreference> = {}): ThemePreference => ({
  ...DEFAULT_THEME,
  ...patch,
});

describe('clampTheme', () => {
  it('keeps a valid preference', () => {
    expect(clampTheme({ mode: 'schedule', fromHour: 21, toHour: 6 })).toEqual({
      mode: 'schedule',
      fromHour: 21,
      toHour: 6,
    });
  });

  it('falls back to the defaults for junk', () => {
    expect(clampTheme(null)).toEqual(DEFAULT_THEME);
    expect(clampTheme('dark')).toEqual(DEFAULT_THEME);
    expect(clampTheme({ mode: 'midnight' })).toEqual(DEFAULT_THEME);
    expect(clampTheme({ fromHour: 'late' })).toEqual(DEFAULT_THEME);
  });

  it('clamps hours into the day', () => {
    expect(clampTheme({ mode: 'schedule', fromHour: -3, toHour: 47 })).toEqual({
      mode: 'schedule',
      fromHour: 0,
      toHour: 23,
    });
    expect(clampTheme({ mode: 'schedule', fromHour: 20.6, toHour: 6.2 }).fromHour).toBe(21);
  });

  it('keeps hours through a mode change, so a schedule survives a detour', () => {
    expect(clampTheme({ mode: 'light', fromHour: 22, toHour: 5 })).toEqual({
      mode: 'light',
      fromHour: 22,
      toHour: 5,
    });
  });
});

describe('isNightHour', () => {
  it('covers a window that wraps around midnight', () => {
    expect(isNightHour(19, 20, 7)).toBe(false);
    expect(isNightHour(20, 20, 7)).toBe(true);
    expect(isNightHour(23, 20, 7)).toBe(true);
    expect(isNightHour(0, 20, 7)).toBe(true);
    expect(isNightHour(6, 20, 7)).toBe(true);
    expect(isNightHour(7, 20, 7)).toBe(false);
  });

  it('covers a window inside one day', () => {
    expect(isNightHour(12, 9, 17)).toBe(true);
    expect(isNightHour(8, 9, 17)).toBe(false);
    expect(isNightHour(17, 9, 17)).toBe(false);
  });

  it('treats a zero-length window as never', () => {
    for (let hour = 0; hour < 24; hour++) expect(isNightHour(hour, 8, 8)).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('ignores the device and the clock when a palette is pinned', () => {
    expect(resolveTheme(pref({ mode: 'light' }), { hour: 23, prefersDark: true })).toBe('light');
    expect(resolveTheme(pref({ mode: 'dark' }), { hour: 11, prefersDark: false })).toBe('dark');
  });

  it('follows the device when matching it', () => {
    expect(resolveTheme(pref({ mode: 'system' }), { hour: 3, prefersDark: false })).toBe('light');
    expect(resolveTheme(pref({ mode: 'system' }), { hour: 3, prefersDark: true })).toBe('dark');
  });

  it('follows the clock on a schedule, whatever the device says', () => {
    const scheduled = pref({ mode: 'schedule', fromHour: 20, toHour: 7 });
    expect(resolveTheme(scheduled, { hour: 22, prefersDark: false })).toBe('dark');
    expect(resolveTheme(scheduled, { hour: 12, prefersDark: true })).toBe('light');
  });
});

describe('msUntilNextHour', () => {
  const at = (h: number, m: number, s = 0, ms = 0) =>
    new Date(2026, 7, 27, h, m, s, ms).getTime();

  it('counts to the top of the next hour', () => {
    expect(msUntilNextHour(at(20, 59, 30))).toBe(30_000);
    expect(msUntilNextHour(at(6, 30))).toBe(30 * 60_000);
  });

  it('waits a full hour when it is exactly on the hour', () => {
    expect(msUntilNextHour(at(7, 0))).toBe(60 * 60_000);
  });

  it('never returns a wait that would spin', () => {
    for (let minute = 0; minute < 60; minute++) {
      expect(msUntilNextHour(at(1, minute, 59, 999))).toBeGreaterThan(0);
    }
  });
});

describe('fmtHour', () => {
  it('reads as a clock time', () => {
    expect(fmtHour(7)).toBe('07:00');
    expect(fmtHour(20)).toBe('20:00');
    expect(fmtHour(0)).toBe('00:00');
  });
});
