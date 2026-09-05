'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CloudOff,
  Check,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { LogEntry } from '@/types';
import { logStore, useLogs } from '@/hooks/useLogs';
import { backupFilename, fromBackup, toBackup } from '@/lib/backup';
import { mergeEntries } from '@/lib/sync/merge';
import { forgetSyncState } from '@/lib/sync/engine';

export default function AccountPage() {
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-gray-50 pb-12 dark:bg-slate-950">
      <header className="bg-white px-4 py-4 shadow-sm mb-6 sticky top-0 z-10 dark:bg-slate-900 dark:shadow-black/40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl dark:text-slate-100">Sync</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {status === 'loading' && (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-300 dark:text-slate-700" />
          </div>
        )}
        {status === 'unconfigured' && <Unconfigured />}
        {status === 'signedOut' && <SignIn />}
        {status === 'signedIn' && (
          <SignedIn email={user?.email ?? ''} onSignOut={signOut} />
        )}
        {/* Below every state, because a backup file needs no account at all. */}
        {status !== 'loading' && <BackupCard />}
      </div>
    </main>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-slate-900 dark:border-slate-800 dark:shadow-black/30">
      <h2 className="text-base font-bold text-gray-800 mb-1 md:text-lg dark:text-slate-100">{title}</h2>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed md:text-sm dark:text-slate-400">{hint}</p>
      {children}
    </section>
  );
}

/** A build with no Supabase project. The app is complete without one. */
function Unconfigured() {
  return (
    <Card
      title="Sync is not set up"
      hint="This copy of the app was built without a Supabase project, so everything stays on this device — exactly as it worked before. Nothing is missing or broken."
    />
  );
}

function SignIn() {
  const { sendLink, verifyCode } = useAuth();
  const { logs } = useLogs();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendLink(email.trim());
      setSent(email.trim());
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (busy || !sent || token.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Nothing to do on success: the auth listener sees the new session and
      // the page re-renders as signed in, exactly as it does for the link.
      await verifyCode(sent, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Card
        title="Check your email"
        hint={`A message is on its way to ${sent}. Type the code from it below — that signs you in right here, where your readings are. The link in the email works too, but only if it opens in this same browser.`}
      >
        <form onSubmit={submitCode} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            required
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="123456"
            aria-label="Code from the email"
            className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 tracking-widest focus:border-blue-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Sign in with the code
          </button>
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 md:text-sm">{error}</p>
          )}
        </form>
        <button
          onClick={() => {
            setSent(null);
            setError(null);
          }}
          className="w-full mt-2 py-3 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors md:text-base dark:text-slate-500 dark:hover:text-slate-300"
        >
          Use a different address
        </button>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Keep your history safe"
        hint="Right now everything lives on this device alone, and clearing the browser's site data would take it with it. Sign in and your readings are backed up and follow you to any other device."
      >
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 focus:border-blue-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            Email me a sign-in link
          </button>
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 md:text-sm">{error}</p>
          )}
          {/* No password to choose, forget, or reset — the emailed code is the sign-in. */}
          <p className="text-xs text-gray-400 dark:text-slate-500">
            No password needed. We email you a code to type in here, and a link.
          </p>
        </form>
      </Card>

      {logs.length > 0 && (
        <p className="px-1 text-xs text-gray-400 dark:text-slate-500 md:text-sm">
          The {logs.length} {logs.length === 1 ? 'reading' : 'readings'} already on this
          device will be uploaded when you sign in. Nothing is deleted or overwritten.
        </p>
      )}
    </>
  );
}

function SignedIn({ email, onSignOut }: { email: string; onSignOut: () => Promise<void> }) {
  const sync = useSync();
  const { logs } = useLogs();

  if (sync.state === 'needsDecision') return <DifferentAccount email={email} sync={sync} />;

  return (
    <>
      <Card
        title="Signed in"
        hint={`Your readings are synced to ${email}. Sign in with the same address on another device and the same history appears there.`}
      >
        <SyncStatus sync={sync} count={logs.length} />
        <button
          onClick={sync.syncNow}
          disabled={sync.state === 'syncing'}
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw size={16} className={sync.state === 'syncing' ? 'animate-spin' : ''} />
          Sync now
        </button>
      </Card>

      <Card
        title="Sign out"
        hint="Your history stays on this device — signing out only stops it syncing. Sign back in with the same address to pick up where you left off."
      >
        <button
          onClick={async () => {
            await onSignOut();
            await forgetSyncState();
          }}
          className="w-full py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-500 hover:border-gray-300 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
        >
          Sign out
        </button>
      </Card>
    </>
  );
}

function SyncStatus({ sync, count }: { sync: ReturnType<typeof useSync>; count: number }) {
  if (sync.state === 'syncing') {
    return (
      <Status icon={<Loader2 size={16} className="animate-spin" />} tone="muted">
        Syncing…
      </Status>
    );
  }
  if (sync.state === 'offline') {
    return (
      <Status icon={<CloudOff size={16} />} tone="muted">
        Offline. Your {count} {count === 1 ? 'reading is' : 'readings are'} safe on this
        device and will upload when the connection is back.
      </Status>
    );
  }
  if (sync.state === 'error') {
    return (
      <Status icon={<TriangleAlert size={16} />} tone="warn">
        {sync.error ?? 'Sync failed.'} Nothing was lost — it will try again.
      </Status>
    );
  }
  return (
    <Status icon={<Check size={16} />} tone="good">
      {count} {count === 1 ? 'reading' : 'readings'} backed up
      {sync.lastSyncedAt && ` · ${fmtAgo(sync.lastSyncedAt)}`}
    </Status>
  );
}

function Status({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: 'good' | 'warn' | 'muted';
  children: React.ReactNode;
}) {
  const colour =
    tone === 'good'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-gray-400 dark:text-slate-500';
  return (
    <p className={`flex items-start gap-2 text-xs md:text-sm ${colour}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function fmtAgo(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

/**
 * A different account has signed in on a device that already holds somebody's
 * history. Neither answer may delete anything, so the choice is only about
 * where the existing readings go — not whether they survive.
 */
function DifferentAccount({
  email,
  sync,
}: {
  email: string;
  sync: ReturnType<typeof useSync>;
}) {
  const { logs } = useLogs();

  return (
    <Card
      title="Whose readings are these?"
      hint={`This device already holds ${logs.length} ${logs.length === 1 ? 'reading' : 'readings'} that were last synced to a different account. They stay on the device either way — the only question is whether ${email} should have them too.`}
    >
      <div className="space-y-2">
        <button
          onClick={sync.uploadLocal}
          className="w-full py-3 rounded-xl bg-blue-500 font-bold text-white hover:bg-blue-600 transition-colors"
        >
          They are mine — add them to this account
        </button>
        <button
          onClick={sync.keepLocalOnly}
          className="w-full py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-500 hover:border-gray-300 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
        >
          Leave them out of this account
        </button>
      </div>
    </Card>
  );
}

/**
 * A copy of the history as a file, and a way to read one back.
 *
 * Deliberately independent of sync: it needs no account, works with no network,
 * and answers "I would like my data out of here" — which the app's own warning
 * about clearing site data makes a fair thing to want.
 */
function BackupCard() {
  const { logs } = useLogs();
  const fileInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const download = () => {
    // Tombstones and all: `logStore` rather than the filtered `logs`, so a
    // restore does not undo deletions made before the backup was taken.
    const json = JSON.stringify(toBackup(logStore.get()), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFilename();
    link.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file: File) => {
    setResult(null);
    setFailed(false);
    let entries;
    try {
      entries = fromBackup(JSON.parse(await file.text()));
    } catch {
      entries = null;
    }
    if (entries === null) {
      setFailed(true);
      setResult('That does not look like a Buteyko backup.');
      return;
    }

    // Merged, never replaced. The same rules as syncing a second device: an
    // entry present on only one side is kept, and where both have one the more
    // recently changed wins. Restoring can add readings and cannot lose any.
    //
    // Counted by what the user will actually see in the history: a backup
    // carries tombstones too, and reporting those as restored readings would
    // promise more than the history then shows.
    const visible = (list: LogEntry[]) => list.filter(entry => entry.deletedAt === null).length;
    const before = visible(logStore.get());
    const ok = await logStore.update(local => mergeEntries(local, entries));
    const added = visible(logStore.get()) - before;

    if (!ok) {
      setFailed(true);
      setResult('There was no room to save the restored readings.');
      return;
    }
    setResult(
      added === 0
        ? `Nothing new — every reading in that file was already here.`
        : `Restored ${added} ${added === 1 ? 'reading' : 'readings'}.`,
    );
  };

  return (
    <Card
      title="Your data"
      hint="A copy of every reading as a file you keep. No account needed, and restoring merges what is in the file with what is already here — it never overwrites or deletes."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={download}
          disabled={logs.length === 0}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Download size={16} /> Download
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-500 hover:border-gray-300 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
        >
          <Upload size={16} /> Restore
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          // Cleared so that picking the same file twice fires a change event.
          e.target.value = '';
          if (file) void restore(file);
        }}
      />

      {result && (
        <p
          className={`mt-3 text-xs md:text-sm ${
            failed ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
          }`}
        >
          {result}
        </p>
      )}
    </Card>
  );
}
