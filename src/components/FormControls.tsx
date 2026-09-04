'use client';

import React from 'react';

interface ChoiceRowProps {
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (value: number) => void;
}

/** A row of preset durations, the chosen one highlighted. */
export function ChoiceRow({ options, value, onChange }: ChoiceRowProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors md:text-base ${
            value === option.value
              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
              : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
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
export function CustomDuration({ label, unit, valueSeconds, min, max, onChange }: CustomDurationProps) {
  const { perSecond, step, parse, inputMode } = UNITS[unit];
  const [draft, setDraft] = React.useState('');
  // Labels contain spaces, which an id built from them would not survive —
  // useId is guaranteed to be a valid, unique element id.
  const id = React.useId();

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
      <label className="text-sm text-gray-500 md:text-base dark:text-slate-400" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode={inputMode}
        min={inUnits(min)}
        max={inUnits(max)}
        step={step}
        className="w-24 py-2 px-3 text-center border-2 border-gray-200 rounded-xl font-mono font-bold text-gray-700 focus:border-blue-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
        placeholder={String(inUnits(valueSeconds))}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
      />
      <span className="text-sm text-gray-400 dark:text-slate-500">{unit}</span>
    </div>
  );
}
