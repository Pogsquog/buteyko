'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Minus, Plus, RotateCcw } from 'lucide-react';
import { useFormat } from '@/hooks/useFormat';
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
import { fmtDuration } from '@/lib/time';
import { sequenceLabels, UNDECIDED_PAUSE } from '@/lib/sequence';

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded } = useFormat();

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white px-4 py-4 shadow-sm mb-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Exercise Set Format</h1>
        </div>
      </header>

      {/* The frame above is drawn immediately; the controls wait for the stored
          format, so defaults are never shown as if they were the user's own. */}
      {isLoaded ? (
        <FormatControls />
      ) : (
        <div className="max-w-2xl mx-auto px-4 flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      )}
    </main>
  );
}

function FormatControls() {
  const { format, setFormat, resetFormat } = useFormat();

  const sequence = sequenceLabels(format.blocks, (_, isLast) =>
    isLast ? 'CP' : UNDECIDED_PAUSE,
  ).join(' / ');

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-4">
      {/* Live summary of the sequence a session will follow */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Your sequence</p>
        <p className="text-sm font-bold text-blue-700 break-words md:text-base">{sequence}</p>
        <p className="text-xs text-blue-500 mt-1">{describeFormat(format)}</p>
      </section>

      <Card
        title="Reduced breathing blocks"
        hint="How many RB chunks the set is split into. Each one is followed by a pause."
      >
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setFormat({ blocks: format.blocks - 1 })}
            disabled={format.blocks <= MIN_BLOCKS}
            className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="One block fewer"
          >
            <Minus size={20} />
          </button>
          <span className="text-4xl font-mono font-bold text-gray-800 w-12 text-center">{format.blocks}</span>
          <button
            onClick={() => setFormat({ blocks: format.blocks + 1 })}
            disabled={format.blocks >= MAX_BLOCKS}
            className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors md:text-base"
      >
        <RotateCcw size={15} /> Reset to the standard format
      </button>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-base font-bold text-gray-800 mb-1 md:text-lg">{title}</h2>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed md:text-sm">{hint}</p>
      {children}
    </section>
  );
}

interface ChoiceRowProps {
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (value: number) => void;
}

function ChoiceRow({ options, value, onChange }: ChoiceRowProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors md:text-base ${
            value === option.value
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Blocks are thought about in minutes; rests are short enough to think about in seconds. */
const UNITS = {
  min: { perSecond: 60, step: 0.5, parse: parseFloat, inputMode: 'decimal' as const },
  s: { perSecond: 1, step: 5, parse: (raw: string) => parseInt(raw, 10), inputMode: 'numeric' as const },
};

interface CustomDurationProps {
  label: string;
  unit: keyof typeof UNITS;
  valueSeconds: number;
  min: number;
  max: number;
  onChange: (seconds: number) => void;
}

/** Free-form entry, committed on blur/Enter so partial typing isn't clamped mid-keystroke. */
function CustomDuration({ label, unit, valueSeconds, min, max, onChange }: CustomDurationProps) {
  const { perSecond, step, parse, inputMode } = UNITS[unit];
  const [draft, setDraft] = React.useState('');

  const commit = () => {
    const typed = parse(draft);
    if (Number.isFinite(typed)) {
      onChange(Math.min(max, Math.max(min, Math.round(typed * perSecond))));
    }
    setDraft('');
  };

  const inUnits = (seconds: number) =>
    perSecond === 1 ? seconds : Math.round((seconds / perSecond) * 10) / 10;

  return (
    <div className="flex items-center gap-3 mt-4">
      <label className="text-sm text-gray-500 md:text-base" htmlFor={`custom-${unit}-${label}`}>
        {label}
      </label>
      <input
        id={`custom-${unit}-${label}`}
        type="number"
        inputMode={inputMode}
        min={inUnits(min)}
        max={inUnits(max)}
        step={step}
        className="w-24 py-2 px-3 text-center border-2 border-gray-200 rounded-xl font-mono font-bold text-gray-700 focus:border-blue-500 outline-none"
        placeholder={String(inUnits(valueSeconds))}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
      />
      <span className="text-sm text-gray-400">{unit}</span>
    </div>
  );
}
