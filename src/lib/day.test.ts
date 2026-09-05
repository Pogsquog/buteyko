import { describe, expect, it } from 'vitest';
import { dayKey, dayStart, fmtDayHeading, groupByDay } from '@/lib/day';
import { LogEntry } from '@/types';

const at = (timestamp: number, id = String(timestamp)): LogEntry => ({
  id,
  kind: 'cp',
  timestamp,
  cp: 20,
  activity: null,
  updatedAt: timestamp,
  deletedAt: null,
  notes: '',
});

/** Local time, so the keys below do not depend on the machine's zone. */
const local = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();

describe('dayKey', () => {
  it('reads the local calendar day, zero-padded so it sorts as a string', () => {
    expect(dayKey(local(2026, 9, 4))).toBe('2026-09-04');
    expect(dayKey(local(2026, 12, 31))).toBe('2026-12-31');
  });

  it('splits two times minutes apart when midnight falls between them', () => {
    expect(dayKey(local(2026, 9, 4, 23, 50))).toBe('2026-09-04');
    expect(dayKey(local(2026, 9, 5, 0, 10))).toBe('2026-09-05');
  });
});

describe('dayStart', () => {
  it('round-trips a key back to midnight of that local day', () => {
    expect(dayKey(dayStart('2026-09-04').getTime())).toBe('2026-09-04');
    expect(dayStart('2026-09-04').getHours()).toBe(0);
  });
});

describe('fmtDayHeading', () => {
  const now = local(2026, 9, 4, 10);

  it('names today and yesterday rather than dating them', () => {
    expect(fmtDayHeading('2026-09-04', now)).toBe('Today');
    expect(fmtDayHeading('2026-09-03', now)).toBe('Yesterday');
  });

  it('dates anything older', () => {
    expect(fmtDayHeading('2026-09-01', now)).not.toBe('Today');
    expect(fmtDayHeading('2026-09-01', now)).toMatch(/1/);
  });

  it('says which year, once the day is in a different one', () => {
    expect(fmtDayHeading('2025-09-01', now)).toMatch(/2025/);
    expect(fmtDayHeading('2026-01-01', now)).not.toMatch(/2026/);
  });

  it('still names yesterday across a month boundary', () => {
    expect(fmtDayHeading('2026-08-31', local(2026, 9, 1, 10))).toBe('Yesterday');
  });
});

describe('groupByDay', () => {
  it('buckets newest-first entries into newest-first days', () => {
    const groups = groupByDay([
      at(local(2026, 9, 4, 18)),
      at(local(2026, 9, 4, 8)),
      at(local(2026, 9, 2, 9)),
    ]);

    expect(groups.map(g => g.key)).toEqual(['2026-09-04', '2026-09-02']);
    expect(groups[0].entries).toHaveLength(2);
  });

  it('keeps the order each day was given', () => {
    const groups = groupByDay([at(local(2026, 9, 4, 18), 'evening'), at(local(2026, 9, 4, 8), 'morning')]);
    expect(groups[0].entries.map(e => e.id)).toEqual(['evening', 'morning']);
  });

  it('returns nothing for nothing', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
