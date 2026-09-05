'use client';

import React from 'react';
import Link, { useLinkStatus } from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLogs } from '@/hooks/useLogs';
import { LogCard } from '@/components/LogCard';
import { StartMenu } from '@/components/StartMenu';
import { fmtDayHeading, groupByDay } from '@/lib/day';
import { Activity, ChevronRight, History, Loader2, Settings2, Wind, Zap } from 'lucide-react';

/**
 * Days of history the home screen carries. Enough to see how the last few days
 * have gone at a glance; everything older lives on the history page, where
 * there is a calendar to find it with.
 */
const HOME_DAYS = 3;

/**
 * Swaps the icon for a spinner while the route is still loading, so a tap on a
 * slow connection visibly does something instead of looking ignored. Same
 * footprint either way, so nothing shifts.
 */
function QuickStartIcon({ size }: { size: number }) {
  const { pending } = useLinkStatus();
  return pending
    ? <Loader2 size={size} className="animate-spin" />
    : <Zap size={size} />;
}

/**
 * The gear, with the sign-in state as a dot on its corner: whether the history
 * is syncing, and to whom, lives one tap away in Settings, so the dot only has
 * to say that there is something there worth looking at.
 *
 * Undotted while the stored session is still being restored, so a signed-in
 * user is never briefly shown the signed-out dot.
 */
function SettingsLink() {
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn';
  const showDot = signedIn || status === 'signedOut';

  return (
    <Link
      href="/settings"
      className="relative p-2.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
      aria-label={
        signedIn
          ? `Settings — signed in as ${user?.email ?? 'your account'}`
          : showDot
            ? 'Settings — not signed in'
            : 'Settings'
      }
    >
      <Settings2 size={22} />
      {showDot && (
        <span
          aria-hidden
          className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
            signedIn ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
          }`}
        />
      )}
    </Link>
  );
}

export default function Home() {
  const { logs, deleteLog, isLoaded } = useLogs();

  const days = groupByDay(logs);
  const shown = days.slice(0, HOME_DAYS);
  const hasMore = days.length > shown.length;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-28">
      <header className="bg-white dark:bg-slate-900 px-6 py-5 shadow-sm mb-6 sticky top-0 z-10 dark:shadow-black/40">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 dark:bg-blue-700 p-2 rounded-lg text-white">
              <Wind size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 md:text-3xl">Buteyko</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/history"
              className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              aria-label="History"
            >
              <History size={22} />
            </Link>
            <SettingsLink />
            {/* Straight into a set on the saved format — no pre-flight card. */}
            <Link
              href="/new-session?quick=1"
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-transform active:scale-95 flex items-center gap-2 text-sm md:text-base md:px-6 md:py-3"
            >
              <QuickStartIcon size={18} /> Quick Start
            </Link>
          </div>
        </div>
      </header>

      {/* The header above is drawn immediately; only the history has to wait for
          localStorage, so the first paint is the app rather than a blank page. */}
      <div className="max-w-2xl mx-auto px-4">
        {!isLoaded ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-300 dark:text-slate-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
            <Activity size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
            <p className="text-gray-600 dark:text-slate-300 font-medium md:text-lg">No sessions recorded yet.</p>
            <Link
              href="/new-session"
              className="inline-block mt-4 text-blue-600 dark:text-blue-400 font-bold md:text-lg"
            >
              Start your first session
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {shown.map(day => (
              <section key={day.key} className="space-y-3">
                <h2 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest px-1 md:text-sm">
                  {fmtDayHeading(day.key)}
                </h2>
                {day.entries.map(entry => (
                  <LogCard key={entry.id} log={entry} onDelete={deleteLog} showDate={false} />
                ))}
              </section>
            ))}

            {hasMore && (
              <Link
                href="/history"
                className="flex items-center justify-center gap-1 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 md:text-base"
              >
                View all history <ChevronRight size={16} />
              </Link>
            )}
          </div>
        )}
      </div>

      <StartMenu />
    </main>
  );
}
