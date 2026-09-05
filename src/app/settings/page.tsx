'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, CloudUpload, Loader2, Minus, Moon, Plus, RotateCcw, Sun } from 'lucide-react';
import { AuthStatus, useAuth } from '@/hooks/useAuth';
import { useFormat } from '@/hooks/useFormat';
import { useTheme } from '@/hooks/useTheme';
import { ThemeMode } from '@/types';
import {
  describeFormat,
  MAX_BLOCKS,
  MAX_RB_DURATION,
  MAX_REST_DURATION,
  MIN_BLOCKS,
  MIN_RB_DURATION,
  RB_PRESETS,
  REST_PRESETS,
} from '@/lib/sessionFormat';
import { fmtHour } from '@/lib/theme';
import { fmtDuration } from '@/lib/time';
import { sequenceLabels, UNDECIDED_PAUSE } from '@/lib/sequence';
import { ChoiceRow, CustomDuration } from '@/components/FormControls';

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded: formatIsLoaded } = useFormat();
  const { isLoaded: themeIsLoaded } = useTheme();

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
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl dark:text-slate-100">Settings</h1>
        </div>
      </header>

      {/* The frame above is drawn immediately; the controls wait for the stored
          settings, so defaults are never shown as if they were the user's own. */}
      {formatIsLoaded && themeIsLoaded ? (
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <SyncLink />
          <AppearanceControls />
          <FormatControls />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-300 dark:text-slate-700" />
        </div>
      )}
    </main>
  );
}

/**
 * The account screen owns the detail; this is only the way in — and the one
 * place in the app that answers "am I signed in, and as whom?" without a tap.
 */
function SyncLink() {
  const router = useRouter();
  const { status, user } = useAuth();

  return (
    <button
      onClick={() => router.push('/account')}
      className="flex w-full items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-gray-200 transition-colors dark:bg-slate-900 dark:border-slate-800 dark:shadow-black/30 dark:hover:border-slate-700"
    >
      <CloudUpload size={20} className="shrink-0 text-blue-500" />
      <span className="flex-1 min-w-0">
        <span className="block text-base font-bold text-gray-800 md:text-lg dark:text-slate-100">Sync</span>
        <span className="block text-xs text-gray-500 leading-relaxed md:text-sm dark:text-slate-400">
          Back your history up and read it on your other devices.
        </span>
        <SignInStatus status={status} email={user?.email ?? null} />
      </span>
      <ChevronRight size={18} className="shrink-0 text-gray-300 dark:text-slate-600" />
    </button>
  );
}

/**
 * A quiet line rather than a badge: knowing which address the readings are
 * going to matters on the two devices where it is wrong, and nowhere else.
 *
 * Silent while the stored session is still being restored, so the row never
 * says "not signed in" to somebody who is.
 */
function SignInStatus({ status, email }: { status: AuthStatus; email: string | null }) {
  if (status === 'loading' || status === 'unconfigured') return null;

  const signedIn = status === 'signedIn';
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 md:text-sm dark:text-slate-500">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          signedIn ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      />
      {signedIn ? (
        <span className="truncate">
          Signed in as <span className="text-gray-500 dark:text-slate-400">{email}</span>
        </span>
      ) : (
        <span className="truncate">Not signed in</span>
      )}
    </span>
  );
}

const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match device' },
  { value: 'schedule', label: 'Night hours' },
];

/** Every hour of the day, for the two ends of the night window. */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function AppearanceControls() {
  const { preference, theme, setTheme } = useTheme();
  const isScheduled = preference.mode === 'schedule';
  const windowIsEmpty = preference.fromHour === preference.toHour;

  return (
    <Card
      title="Appearance"
      hint="Dark is easier on the eyes for an evening session. Match device follows your phone's own setting; night hours switch over on a clock instead."
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {THEME_MODE_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setTheme({ mode: option.value })}
            aria-pressed={preference.mode === option.value}
            className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors md:text-base ${
              preference.mode === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isScheduled && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <HourSelect
            label="Dark from"
            value={preference.fromHour}
            onChange={fromHour => setTheme({ fromHour })}
          />
          <HourSelect
            label="until"
            value={preference.toHour}
            onChange={toHour => setTheme({ toHour })}
          />
        </div>
      )}

      {isScheduled && windowIsEmpty && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 md:text-sm">
          Both times are the same, so the dark theme never switches on. Pick an end time
          later than the start.
        </p>
      )}

      {/* What the choice above adds up to at this moment — useful when it is
          the clock or the device, rather than the setting, that decides. */}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 md:text-sm">
        {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
        Right now: {theme}
        {isScheduled && !windowIsEmpty && (
          <span>
            {' '}· {theme === 'dark' ? 'back to light at ' : 'dark from '}
            {fmtHour(theme === 'dark' ? preference.toHour : preference.fromHour)}
          </span>
        )}
      </p>
    </Card>
  );
}

interface HourSelectProps {
  label: string;
  value: number;
  onChange: (hour: number) => void;
}

function HourSelect({ label, value, onChange }: HourSelectProps) {
  const id = React.useId();
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500 dark:text-slate-400 md:text-base" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="py-2 px-3 border-2 border-gray-200 rounded-xl font-mono font-bold text-gray-700 focus:border-blue-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500"
      >
        {HOURS.map(hour => (
          <option key={hour} value={hour}>
            {fmtHour(hour)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormatControls() {
  const { format, setFormat, resetFormat } = useFormat();

  const sequence = sequenceLabels(format.blocks, (_, isLast) =>
    isLast ? 'CP' : UNDECIDED_PAUSE,
  ).join(' / ');

  return (
    <>
      {/* Live summary of the sequence a session will follow */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 dark:bg-blue-950/40 dark:border-blue-900">
        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1 dark:text-blue-400">Your sequence</p>
        <p className="text-sm font-bold text-blue-700 break-words md:text-base dark:text-blue-200">{sequence}</p>
        <p className="text-xs text-blue-500 mt-1 dark:text-blue-400">{describeFormat(format)}</p>
      </section>

      <Card
        title="Reduced breathing blocks"
        hint="How many RB chunks the set is split into. Each one is followed by a pause."
      >
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setFormat({ blocks: format.blocks - 1 })}
            disabled={format.blocks <= MIN_BLOCKS}
            className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="One block fewer"
          >
            <Minus size={20} />
          </button>
          <span className="text-4xl font-mono font-bold text-gray-800 w-12 text-center dark:text-slate-100">{format.blocks}</span>
          <button
            onClick={() => setFormat({ blocks: format.blocks + 1 })}
            disabled={format.blocks >= MAX_BLOCKS}
            className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="One block more"
          >
            <Plus size={20} />
          </button>
        </div>
      </Card>

      <Card
        title="Length of each block"
        hint="The workshop worksheet uses 5 minutes; 10 is common for longer practice."
      >
        <ChoiceRow
          options={RB_PRESETS.map(seconds => ({ value: seconds, label: fmtDuration(seconds) }))}
          value={format.rbDuration}
          onChange={rbDuration => setFormat({ rbDuration })}
        />
        <CustomDuration
          label="Custom length"
          unit="min"
          valueSeconds={format.rbDuration}
          min={MIN_RB_DURATION}
          max={MAX_RB_DURATION}
          onChange={rbDuration => setFormat({ rbDuration })}
        />
      </Card>

      <Card
        title="Rest after each block"
        hint="Regular breathing between reduced breathing and the next CP or EP, so the pause is measured from a settled baseline."
      >
        <ChoiceRow
          options={REST_PRESETS.map(seconds => ({
            value: seconds,
            label: seconds === 0 ? 'Off' : fmtDuration(seconds),
          }))}
          value={format.restDuration}
          onChange={restDuration => setFormat({ restDuration })}
        />
        <CustomDuration
          label="Custom rest"
          unit="s"
          valueSeconds={format.restDuration}
          min={0}
          max={MAX_REST_DURATION}
          onChange={restDuration => setFormat({ restDuration })}
        />
      </Card>

      <button
        onClick={resetFormat}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors md:text-base dark:text-slate-500 dark:hover:text-slate-300"
      >
        <RotateCcw size={15} /> Reset to the standard format
      </button>
    </>
  );
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-slate-900 dark:border-slate-800 dark:shadow-black/30">
      <h2 className="text-base font-bold text-gray-800 mb-1 md:text-lg dark:text-slate-100">{title}</h2>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed md:text-sm dark:text-slate-400">{hint}</p>
      {children}
    </section>
  );
}
