'use client';

import React from 'react';

/** Seconds per inhale / exhale in the pacing animation ≈ 6 breaths a minute. */
export const BREATH_PHASE_SECONDS = 5;

/**
 * The circle that paces reduced breathing. It scales between inhale and exhale
 * over the phase length rather than animating on its own interval, so it stays
 * in step with the clock after the tab has been backgrounded.
 */
export function BreathPacer({ isRunning, phase }: { isRunning: boolean; phase: 'inhale' | 'exhale' }) {
  return (
    <div className="flex flex-col items-center mb-3">
      <div className="w-20 h-20 flex items-center justify-center">
        <div
          className={`w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 transition-transform ease-in-out ${
            isRunning && phase === 'inhale' ? 'scale-100' : 'scale-[0.55]'
          }`}
          style={{ transitionDuration: `${BREATH_PHASE_SECONDS * 1000}ms` }}
        />
      </div>
      <p className="text-xs text-blue-400 mt-2 h-4 font-medium">
        {isRunning
          ? phase === 'inhale' ? 'breathe in…' : 'breathe out…'
          : 'breathe gently through your nose'}
      </p>
    </div>
  );
}

interface PulsePhaseStyle {
  ring: string;
  dot: string;
  dotSize: string;
  text: string;
  runningLabel: string;
  idleLabel: string;
}

/** Holds and rests draw the same badge; only the colour and the wording differ. */
const PULSE_PHASES: Record<'hold' | 'rest', PulsePhaseStyle> = {
  hold: {
    ring: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-300 dark:bg-amber-500',
    dotSize: 'w-4 h-4',
    text: 'text-amber-500 dark:text-amber-300',
    runningLabel: 'holding…',
    idleLabel: 'breathe out normally, then hold',
  },
  rest: {
    ring: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-300 dark:bg-emerald-500',
    dotSize: 'w-5 h-5',
    text: 'text-emerald-500 dark:text-emerald-300',
    runningLabel: 'breathe normally…',
    idleLabel: 'let your breathing settle',
  },
};

export function PulsePhase({ kind, isRunning }: { kind: 'hold' | 'rest'; isRunning: boolean }) {
  const style = PULSE_PHASES[kind];
  return (
    <div className="flex flex-col items-center mb-3">
      <div
        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors duration-700 ${
          isRunning ? style.ring : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
        }`}
      >
        <div
          className={`${style.dotSize} rounded-full transition-colors duration-700 ${
            isRunning ? `${style.dot} animate-pulse` : 'bg-gray-200 dark:bg-slate-700'
          }`}
        />
      </div>
      <p
        className={`text-xs mt-2 h-4 font-medium transition-colors duration-700 ${
          isRunning ? style.text : 'text-gray-400 dark:text-slate-500'
        }`}
      >
        {isRunning ? style.runningLabel : style.idleLabel}
      </p>
    </div>
  );
}
