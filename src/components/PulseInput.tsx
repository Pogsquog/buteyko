'use client';

import React, { useCallback, useState } from 'react';
import { Bluetooth, Loader2, Minus, Plus, Timer as TimerIcon, X } from 'lucide-react';
import { useHeartRate } from '@/hooks/useHeartRate';
import { useTimer } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { playAlarm, primeAlarm } from '@/lib/alarm';

interface PulseInputProps {
  label: string;
  value?: number;
  onChange: (v: number) => void;
  onNext: () => void;
}

export const PulseInput: React.FC<PulseInputProps> = ({ label, value, onChange, onNext }) => {
  const { read, state, isSupported, clearError } = useHeartRate();
  const [isCounting, setIsCounting] = useState(false);
  const isBusy = state.status === 'connecting' || state.status === 'reading';

  const handleBluetooth = async () => {
    const bpm = await read();
    if (bpm !== null) onChange(bpm);
  };

  if (isCounting) {
    return (
      <PulseCounter
        label={label}
        onCancel={() => setIsCounting(false)}
        onUse={bpm => {
          onChange(bpm);
          setIsCounting(false);
          onNext();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-2 md:text-3xl">{label}</h2>
      <p className="text-sm text-gray-500 mb-6 text-center md:text-base">Beats per minute</p>

      <input
        type="number"
        inputMode="numeric"
        min={30}
        max={220}
        className="text-5xl w-36 py-4 text-center border-2 border-blue-300 rounded-2xl mb-4 font-mono font-bold text-gray-800 focus:border-blue-500 outline-none md:text-6xl md:w-44 md:py-5"
        placeholder="–"
        value={value ?? ''}
        autoFocus
        onChange={e => onChange(parseInt(e.target.value) || 0)}
      />

      <div className="flex flex-col items-center gap-2 mb-6">
        <button
          onClick={() => setIsCounting(true)}
          className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 transition-colors md:text-base"
        >
          <TimerIcon size={15} /> Count with a timer
        </button>

        {isSupported && (
          <button
            onClick={handleBluetooth}
            disabled={isBusy}
            className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:text-base"
          >
            {isBusy
              ? <><Loader2 size={15} className="animate-spin" /> {state.status === 'connecting' ? 'Connecting…' : 'Reading…'}</>
              : <><Bluetooth size={15} /> Read from device</>
            }
          </button>
        )}
      </div>

      {state.status === 'error' && (
        <p className="text-xs text-red-500 mb-4 text-center max-w-xs">
          {state.message}{' '}
          <button onClick={clearError} className="underline">Dismiss</button>
        </p>
      )}

      <button
        onClick={onNext}
        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-blue-700 active:scale-95 transition-transform md:text-lg md:py-5"
      >
        Next
      </button>
    </div>
  );
};

/** Counting windows, in seconds. Shorter windows are quicker; longer ones are more accurate. */
const COUNT_WINDOWS = [15, 30, 60];

interface PulseCounterProps {
  label: string;
  onUse: (bpm: number) => void;
  onCancel: () => void;
}

/**
 * Counts beats against a countdown so a pulse can be taken by hand: tap along
 * with each beat (or count in your head and type the total afterwards) and the
 * window is scaled up to beats per minute.
 */
function PulseCounter({ label, onUse, onCancel }: PulseCounterProps) {
  const [countWindow, setCountWindow] = useState(15);
  const [beats, setBeats] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const handleFinish = useCallback(() => playAlarm(), []);
  const { elapsed, isRunning, isComplete, start, reset } = useTimer({
    mode: 'countdown',
    targetSeconds: countWindow,
    onFinish: handleFinish,
  });

  useWakeLock(isRunning);

  const isDone = hasStarted && isComplete;
  const remaining = Math.max(0, countWindow - elapsed);
  const bpm = Math.round((beats * 60) / countWindow);

  const begin = () => {
    primeAlarm();
    reset();
    setBeats(0);
    setHasStarted(true);
    start();
  };

  const chooseWindow = (seconds: number) => {
    reset();
    setBeats(0);
    setHasStarted(false);
    setCountWindow(seconds);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-1 md:text-3xl">{label}</h2>
      <p className="text-sm text-gray-500 mb-4 text-center md:text-base">
        {isRunning
          ? 'Tap the circle on every beat'
          : isDone
            ? `${beats} beats in ${countWindow} s`
            : 'Find your pulse, then start the countdown'}
      </p>

      {!isRunning && !isDone && (
        <div className="flex gap-2 mb-6">
          {COUNT_WINDOWS.map(seconds => (
            <button
              key={seconds}
              onClick={() => chooseWindow(seconds)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors md:text-base ${
                countWindow === seconds
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {seconds} s
            </button>
          ))}
        </div>
      )}

      {isDone ? (
        <>
          <div className="text-7xl font-mono font-bold tabular-nums text-gray-800 mb-1 md:text-8xl">{bpm}</div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">bpm</p>

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setBeats(b => Math.max(0, b - 1))}
              className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="One beat fewer"
            >
              <Minus size={18} />
            </button>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={300}
                className="text-3xl w-24 py-2 text-center border-2 border-gray-200 rounded-xl font-mono font-bold text-gray-700 focus:border-blue-500 outline-none"
                value={beats}
                onChange={e => setBeats(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-sm font-semibold text-gray-400">beats</span>
            </div>
            <button
              onClick={() => setBeats(b => b + 1)}
              className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="One beat more"
            >
              <Plus size={18} />
            </button>
          </div>

          <button
            onClick={() => onUse(bpm)}
            disabled={bpm <= 0}
            className="bg-green-500 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-green-600 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 md:text-lg md:py-5"
          >
            Use {bpm} bpm
          </button>
          <button
            onClick={begin}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors md:text-base"
          >
            Count again
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => { if (isRunning) setBeats(b => b + 1); else begin(); }}
            className={`w-44 h-44 rounded-full border-4 flex flex-col items-center justify-center mb-6 transition-colors select-none active:scale-95 md:w-52 md:h-52 ${
              isRunning
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300'
            }`}
          >
            {isRunning ? (
              <>
                <span className="text-6xl font-mono font-bold tabular-nums md:text-7xl">{beats}</span>
                <span className="text-xs font-semibold uppercase tracking-wider mt-1">beats · {remaining} s left</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold md:text-4xl">Start</span>
                <span className="text-xs font-semibold uppercase tracking-wider mt-1">{countWindow} s count</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed mb-2">
            {isRunning
              ? 'Keep tapping until the chime — the count is scaled to a full minute.'
              : 'You can also count in your head and type the total in afterwards.'}
          </p>
        </>
      )}

      <button
        onClick={onCancel}
        className="mt-2 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors md:text-base"
      >
        <X size={15} /> Enter the number instead
      </button>
    </div>
  );
}
