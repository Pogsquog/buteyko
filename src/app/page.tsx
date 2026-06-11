'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLogs } from '@/hooks/useLogs';
import { LogCard } from '@/components/LogCard';
import { Plus, Activity, Wind } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { logs, deleteLog, isLoaded } = useLogs();

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white p-6 shadow-sm mb-6 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Wind size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Buteyko</h1>
          </div>
          <button 
            onClick={() => router.push('/new-session')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4">
        {logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Activity size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No sessions recorded yet.</p>
            <button 
              onClick={() => router.push('/new-session')}
              className="mt-4 text-blue-600 font-bold"
            >
              Start your first session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">History</h2>
            {logs.map(log => (
              <LogCard key={log.id} log={log} onDelete={deleteLog} />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 left-6 max-w-md mx-auto">
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
