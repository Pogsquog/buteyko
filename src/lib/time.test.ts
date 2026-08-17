import { describe, expect, it } from 'vitest';
import { fmtClock, fmtCompact, fmtDuration, fmtSeconds } from '@/lib/time';

describe('fmtClock', () => {
  it('reads as a clock, zero-padding the seconds', () => {
    expect(fmtClock(0)).toBe('0:00');
    expect(fmtClock(9)).toBe('0:09');
    expect(fmtClock(65)).toBe('1:05');
    expect(fmtClock(600)).toBe('10:00');
    expect(fmtClock(3671)).toBe('61:11');
  });
});

describe('fmtDuration', () => {
  it('stays in seconds below a minute', () => {
    expect(fmtDuration(0)).toBe('0 s');
    expect(fmtDuration(45)).toBe('45 s');
  });

  it('switches to minutes at a minute, keeping one decimal where it helps', () => {
    expect(fmtDuration(60)).toBe('1 min');
    expect(fmtDuration(600)).toBe('10 min');
    expect(fmtDuration(450)).toBe('7.5 min');
  });
});

describe('fmtCompact', () => {
  it('drops the minutes for a sub-minute value', () => {
    expect(fmtCompact(30)).toBe('30s');
  });

  it('drops the seconds for a whole number of minutes', () => {
    expect(fmtCompact(600)).toBe('10m');
  });

  it('shows both when there are both', () => {
    expect(fmtCompact(90)).toBe('1:30');
  });
});

describe('fmtSeconds', () => {
  it('is always seconds, because a pause always is', () => {
    expect(fmtSeconds(21)).toBe('21s');
    expect(fmtSeconds(0)).toBe('0s');
  });
});
