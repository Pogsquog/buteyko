'use client';

import React from 'react';
import Link, { useLinkStatus } from 'next/link';
import { useLogs } from '@/hooks/useLogs';
import { LogCard } from '@/components/LogCard';
import { Plus, Activity, Loader2, Settings2, Wind } from 'lucide-react';

/**
 * Swaps the icon for a spinner while the route is still loading, so a tap on a
 * slow connection visibly does something instead of looking ignored. Same
 * footprint either way, so nothing shifts.
 */
function NewSessionIcon({ size }: { size: number }) {
  const { pending } = useLinkStatus();
  return pending
    ? <Loader2 size={size} className="animate-spin" />
    : <Plus size={size} />;
}

export default function Home() {
  const { logs, deleteLog, isLoaded } = useLogs();

  return (
    <main className="min-h-screen bg-gray-50 pb-28 md:pb-8">
      <header className="bg-white px-6 py-5 shadow-sm mb-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Wind size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">Buteyko</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Exercise set format"
            >
              <Settings2 size={22} />
            </Link>
            <Link
              href="/new-session"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-transform active:scale-95 flex items-center gap-2 text-sm md:text-base md:px-6 md:py-3"
            >
              <NewSessionIcon size={18} /> New Session
            </Link>
          </div>
        </div>
      </header>

      {/* The header above is drawn immediately; only the history has to wait for
          localStorage, so the first paint is the app rather than a blank page. */}
      <div className="max-w-2xl mx-auto px-4">
        {!isLoaded ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Activity size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium md:text-lg">No sessions recorded yet.</p>
            <Link
              href="/new-session"
              className="inline-block mt-4 text-blue-600 font-bold md:text-lg"
            >
              Start your first session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1 md:text-sm">History</h2>
            {logs.map(log => (
              <LogCard key={log.id} log={log} onDelete={deleteLog} />
            ))}
          </div>
        )}
      </div>

      {/* FAB — only visible on mobile where the header button is small */}
      <div className="fixed bottom-6 right-6 left-6 max-w-2xl mx-auto md:hidden">
        <Link
          href="/new-session"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <NewSessionIcon size={20} /> New Exercise Set
        </Link>
      </div>
    </main>
  );
}
