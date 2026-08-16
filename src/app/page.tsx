'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogs } from '@/hooks/useLogs';
import { LogCard } from '@/components/LogCard';
import { Plus, Activity, Settings2, Wind } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { logs, deleteLog, isLoaded } = useLogs();

  if (!isLoaded) return null;

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
            <button
              onClick={() => router.push('/new-session')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-transform active:scale-95 flex items-center gap-2 text-sm md:text-base md:px-6 md:py-3"
            >
              <Plus size={18} /> New Session
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4">
        {logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Activity size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium md:text-lg">No sessions recorded yet.</p>
            <button
              onClick={() => router.push('/new-session')}
              className="mt-4 text-blue-600 font-bold md:text-lg"
            >
              Start your first session
            </button>
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
        <button
          onClick={() => router.push('/new-session')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={20} /> New Exercise Set
        </button>
      </div>
    </main>
  );
}
