import { LogEntry } from '@/types';

/**
 * History is read a day at a time, so entries are bucketed by local calendar
 * day rather than by elapsed hours — 23:50 and 00:10 belong to different days
 * however few minutes separate them.
 */

/** Local calendar day as `YYYY-MM-DD`, sortable as a string. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Midnight at the start of a `YYYY-MM-DD`, in local time. */
export function dayStart(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * "Today" / "Yesterday" / "Mon 3 Sep". `now` is a parameter so the heading can
 * be tested without waiting for midnight.
 */
export function fmtDayHeading(key: string, now: number = Date.now()): string {
  const today = dayKey(now);
  if (key === today) return 'Today';
  const yesterday = dayKey(now - 24 * 60 * 60 * 1000);
  if (key === yesterday) return 'Yesterday';
  const date = dayStart(key);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export interface DayGroup {
  key: string;
  entries: LogEntry[];
}

/**
 * Groups newest-first entries into newest-first days, each day keeping the
 * order it was given.
 */
export function groupByDay(entries: LogEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.timestamp);
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, entries: [entry] });
  }
  return groups;
}
