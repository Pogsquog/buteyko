'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useLogs } from '@/hooks/useLogs';
import { LogCard } from '@/components/LogCard';
import { dayKey, fmtDayHeading, groupByDay } from '@/lib/day';

/** Monday-first, which is how a week reads on the worksheet. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Month {
  year: number;
  /** 0–11, as `Date` counts them. */
  month: number;
}

const monthOf = (timestamp: number): Month => {
  const date = new Date(timestamp);
  return { year: date.getFullYear(), month: date.getMonth() };
};

const shiftMonth = ({ year, month }: Month, by: number): Month => {
  const date = new Date(year, month + by, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

const isSameMonth = (a: Month, b: Month) => a.year === b.year && a.month === b.month;

/**
 * The days to draw for a month, Monday-first, padded with nulls so the first of
 * the month lands under the right weekday.
 */
function monthGrid({ year, month }: Month): Array<string | null> {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; shift it so Monday is 0.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(year, month, i + 1).getTime())),
  ];
}

export default function HistoryPage() {
  const router = useRouter();
  const { logs, deleteLog, isLoaded } = useLogs();

  // Read once, at mount: the calendar should not jump to a new month because
  // a render happened to land the other side of midnight on New Year's Eve.
  const [thisMonth] = useState(() => monthOf(Date.now()));
  const [visibleMonth, setVisibleMonth] = useState<Month>(thisMonth);
  /** The day being looked at, or null for the whole month. */
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // How many entries each day holds, for the dots on the calendar.
  const countsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      const key = dayKey(log.timestamp);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [logs]);

  const grid = monthGrid(visibleMonth);
  const monthLabel = new Date(visibleMonth.year, visibleMonth.month, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Entries are stored newest-first, so both of these come out that way too.
  const visible = selectedDay
    ? logs.filter(log => dayKey(log.timestamp) === selectedDay)
    : logs.filter(log => isSameMonth(monthOf(log.timestamp), visibleMonth));
  const days = groupByDay(visible);

  // Nothing can be logged in the future, so there is never a next month to see.
  const canGoForward = !isSameMonth(visibleMonth, thisMonth);

  const goToMonth = (by: number) => {
    setVisibleMonth(month => shiftMonth(month, by));
    setSelectedDay(null); // a day from the old month means nothing in the new one
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-12 dark:bg-slate-950">
      <header className="bg-white px-4 py-4 shadow-sm mb-6 sticky top-0 z-10 dark:bg-slate-900 dark:shadow-black/40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl dark:text-slate-100">History</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* The frame is drawn immediately; only the entries wait for localStorage. */}
        {!isLoaded ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-300 dark:text-slate-600" />
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-slate-900 dark:border-slate-800 dark:shadow-black/30">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => goToMonth(-1)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-base font-bold text-gray-800 md:text-lg dark:text-slate-100">{monthLabel}</h2>
                <button
                  onClick={() => goToMonth(1)}
                  disabled={!canGoForward}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  aria-label="Next month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(weekday => (
                  <div
                    key={weekday}
                    className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1 dark:text-slate-500 md:text-xs"
                  >
                    {weekday}
                  </div>
                ))}
                {grid.map((key, i) => {
                  if (key === null) return <div key={`pad-${i}`} />;
                  const count = countsByDay.get(key) ?? 0;
                  const isSelected = key === selectedDay;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(day => (day === key ? null : key))}
                      disabled={count === 0}
                      aria-pressed={isSelected}
                      aria-label={`${fmtDayHeading(key)}, ${count} ${count === 1 ? 'entry' : 'entries'}`}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-colors md:text-base ${
                        isSelected
                          ? 'bg-blue-600 text-white dark:bg-blue-700'
                          : count > 0
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50'
                            : 'text-gray-300 cursor-default dark:text-slate-700'
                      }`}
                    >
                      {Number(key.slice(-2))}
                      {/* A dot per entry, so a busy day reads as busy at a glance. */}
                      <span className="flex gap-0.5 h-1.5 mt-0.5">
                        {Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                          <span
                            key={dot}
                            className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-blue-400 dark:bg-blue-500'}`}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="mt-3 w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors dark:text-slate-500 dark:hover:text-slate-300 md:text-sm"
                >
                  Show all of {monthLabel}
                </button>
              )}
            </section>

            {days.length === 0 ? (
              <p className="text-center py-16 text-gray-500 dark:text-slate-400 md:text-lg">
                Nothing logged {selectedDay ? 'on this day' : `in ${monthLabel}`}.
              </p>
            ) : (
              days.map(day => (
                <section key={day.key} className="space-y-3">
                  <h2 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest px-1 md:text-sm">
                    {fmtDayHeading(day.key)}
                  </h2>
                  {day.entries.map(entry => (
                    <LogCard key={entry.id} log={entry} onDelete={deleteLog} showDate={false} />
                  ))}
                </section>
              ))
            )}

            <Link
              href="/"
              className="block text-center py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 md:text-base"
            >
              Back to today
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
