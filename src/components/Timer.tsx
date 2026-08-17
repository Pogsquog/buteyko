'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Play, Square, RotateCcw, Check, Keyboard, Timer as TimerIcon } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { playAlarm, primeAlarm } from '@/lib/alarm';
import { fmtClock } from '@/lib/time';
import { BREATH_PHASE_SECONDS, BreathPacer, PulsePhase } from '@/components/TimerPhase';

interface TimerProps {
  onComplete: (seconds: number) => void;
  label: string;
  mode?: 'stopwatch' | 'countdown';
  targetSeconds?: number;
  instructions?: string;
  animate?: 'breathe' | 'hold' | 'rest';
  tips?: string[];
  /** Offer a numeric input as an alternative to running the on-screen timer */
  allowManualEntry?: boolean;
  /** Start counting as soon as the step opens (used for the rest between exercises) */
  autoStart?: boolean;
  /** Label for the countdown's cut-it-short button */
  stopLabel?: string;
}

/**
 * Bounds for a typed-in time. The `max` attribute on a number input is only a
 * hint — the browser will not stop anyone typing 500 — so the same limits are
 * enforced here before the value can be recorded.
 */
const MANUAL_MAX_MINUTES = 120;
const MANUAL_MAX_SECONDS = 600;

export const Timer: React.FC<TimerProps> = ({
  onComplete,
  label,
  mode = 'stopwatch',
  targetSeconds = 600,
  instructions,
  animate,
  tips,
  allowManualEntry = false,
  autoStart = false,
  stopLabel = 'Stop',
}) => {
  const [isManual, setIsManual] = useState(false);
  const [manualValue, setManualValue] = useState('');

  const handleFinish = useCallback(() => playAlarm(), []);
  const { elapsed, isRunning, isComplete, start, pause, reset, readNow } = useTimer({
    mode,
    targetSeconds,
    onFinish: handleFinish,
  });

  useWakeLock(isRunning);

  useEffect(() => {
    if (autoStart) {
      primeAlarm();
      start();
    }
  }, [autoStart, start]);

  // Derived from elapsed time rather than its own interval, so the pacer stays
  // in step with the clock after the tab has been backgrounded.
  const breathPhase =
    isRunning && Math.floor(elapsed / BREATH_PHASE_SECONDS) % 2 === 1 ? 'exhale' : 'inhale';

  const toggle = () => {
    if (isComplete) return;
    if (isRunning) {
      pause();
    } else {
      primeAlarm();
      start();
    }
  };

  const confirm = () => {
    const seconds = readNow();
    pause();
    onComplete(seconds);
  };

  // Holds are a handful of seconds; reduced breathing runs for minutes.
  const manualInMinutes = mode === 'countdown';
  const manualMax = manualInMinutes ? MANUAL_MAX_MINUTES : MANUAL_MAX_SECONDS;
  const toManualUnits = (seconds: number) => (manualInMinutes ? Math.round(seconds / 6) / 10 : seconds);

  const openManual = () => {
    pause();
    // Prefill with whatever the timer already counted, else the target duration
    // for a countdown (the usual answer) or nothing at all for a hold.
    if (elapsed > 0) setManualValue(String(toManualUnits(elapsed)));
    else setManualValue(manualInMinutes ? String(toManualUnits(targetSeconds)) : '');
    setIsManual(true);
  };

  const closeManual = () => setIsManual(false);

  const manualNumber = parseFloat(manualValue);
  const manualSeconds = Number.isFinite(manualNumber)
    ? Math.round(manualInMinutes ? manualNumber * 60 : manualNumber)
    : 0;
  // Out-of-range values are refused rather than quietly clamped: this is a
  // measurement, and recording a number the user did not type would be worse
  // than making them retype it.
  const manualIsValid =
    Number.isFinite(manualNumber) && manualNumber > 0 && manualNumber <= manualMax;
  const manualIsTooLarge = Number.isFinite(manualNumber) && manualNumber > manualMax;

  const submitManual = () => {
    if (!manualIsValid) return;
    onComplete(manualSeconds);
  };

  const display = mode === 'countdown' ? fmtClock(Math.max(0, targetSeconds - elapsed)) : fmtClock(elapsed);
  const progress = mode === 'countdown' ? Math.min(100, (elapsed / targetSeconds) * 100) : null;
  const currentTip = tips && tips.length > 0 && isRunning
    ? tips[Math.floor(elapsed / 60) % tips.length]
    : null;

  if (isManual) {
    return (
      <div className="flex flex-col items-center w-full">
        <span className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wider md:text-lg">{label}</span>
        <p className="text-sm text-gray-500 mb-6 text-center md:text-base">
          {manualInMinutes
            ? 'Enter how long you practised for, in minutes'
            : 'Enter the time you held for, in seconds'}
        </p>

        <div className="flex items-baseline gap-2 mb-2">
          <input
            type="number"
            inputMode={manualInMinutes ? 'decimal' : 'numeric'}
            min={0}
            max={manualMax}
            step={manualInMinutes ? 0.5 : 1}
            aria-label={manualInMinutes ? 'Minutes practised' : 'Seconds held'}
            className="text-5xl w-36 py-4 text-center border-2 border-blue-300 rounded-2xl font-mono font-bold text-gray-800 focus:border-blue-500 outline-none md:text-6xl md:w-44 md:py-5"
            placeholder="–"
            value={manualValue}
            autoFocus
            onChange={e => setManualValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitManual(); }}
          />
          <span className="text-lg font-semibold text-gray-400 md:text-xl">{manualInMinutes ? 'min' : 's'}</span>
        </div>

        <p className="h-8 text-xs text-red-500 text-center flex items-center">
          {manualIsTooLarge && `That is more than ${manualMax} ${manualInMinutes ? 'minutes' : 'seconds'}.`}
        </p>

        <button
          onClick={submitManual}
          disabled={!manualIsValid}
          className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg w-full hover:bg-blue-700 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 md:text-xl md:py-5"
        >
          Next Step
        </button>

        <button
          onClick={closeManual}
          className="mt-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors md:text-base"
        >
          <TimerIcon size={15} /> Use the timer instead
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <span className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wider md:text-lg">{label}</span>

      {progress !== null && (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {animate === 'breathe' && <BreathPacer isRunning={isRunning} phase={breathPhase} />}
      {animate === 'hold' && <PulsePhase kind="hold" isRunning={isRunning} />}
      {animate === 'rest' && <PulsePhase kind="rest" isRunning={isRunning} />}

      {instructions && (!animate || !isRunning) && elapsed === 0 && (
        <p className="text-sm text-gray-400 text-center mb-3 max-w-xs leading-relaxed">{instructions}</p>
      )}

      <div
        className={`text-7xl font-mono font-bold tabular-nums mb-1 md:text-8xl ${isComplete ? 'text-green-500' : 'text-gray-800'}`}
        role="timer"
        aria-live="off"
      >
        {display}
      </div>
      <div className="h-7 mb-3 flex items-center">
        {isComplete && <span className="text-green-500 font-semibold text-sm tracking-wide uppercase md:text-base">Complete!</span>}
      </div>

      {isComplete ? (
        <button
          onClick={confirm}
          className="bg-green-500 text-white px-10 py-4 rounded-2xl font-bold text-lg w-full hover:bg-green-600 active:scale-95 transition-transform md:text-xl md:py-5"
        >
          Next Step
        </button>
      ) : (
        <div className="flex gap-3 w-full">
          <button
            onClick={reset}
            aria-label="Reset the timer"
            className="p-4 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors md:p-5"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={toggle}
            className={`flex-1 py-4 rounded-2xl font-bold text-base transition-colors flex items-center justify-center gap-2 md:text-lg md:py-5 ${
              isRunning
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {isRunning
              ? <><Square size={18} /> Pause</>
              : <><Play size={18} className="ml-0.5" /> Start</>
            }
          </button>
          {mode === 'stopwatch' ? (
            <button
              onClick={confirm}
              className="p-4 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition-colors md:p-5"
              aria-label="Record this time"
              title="Record time"
            >
              <Check size={20} />
            </button>
          ) : (
            <button
              onClick={confirm}
              className="p-4 rounded-2xl bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors text-xs font-semibold md:p-5 md:text-sm"
              aria-label={`${stopLabel} early`}
              title={`${stopLabel} early`}
            >
              {stopLabel}
            </button>
          )}
        </div>
      )}

      {allowManualEntry && !isComplete && (
        <button
          onClick={openManual}
          className="mt-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors md:text-base"
        >
          <Keyboard size={15} /> Enter time manually
        </button>
      )}

      {currentTip && (
        <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 w-full">
          <p className="text-xs text-blue-600 leading-relaxed text-center">{currentTip}</p>
        </div>
      )}
    </div>
  );
};
