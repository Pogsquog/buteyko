'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, Check, Keyboard, Timer as TimerIcon } from 'lucide-react';

interface TimerProps {
  onComplete: (seconds: number) => void;
  label: string;
  mode?: 'stopwatch' | 'countdown';
  targetSeconds?: number;
  instructions?: string;
  animate?: 'breathe' | 'hold';
  tips?: string[];
  /** Offer a numeric input as an alternative to running the on-screen timer */
  allowManualEntry?: boolean;
}

export const Timer: React.FC<TimerProps> = ({
  onComplete,
  label,
  mode = 'stopwatch',
  targetSeconds = 600,
  instructions,
  animate,
  tips,
  allowManualEntry = false,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [isManual, setIsManual] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode === 'countdown' && isRunning && elapsed >= targetSeconds) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      setIsRunning(false);
      setIsComplete(true);
    }
  }, [elapsed, mode, targetSeconds, isRunning]);

  // Breathing animation: 5 s per phase ≈ 6 breaths/min
  useEffect(() => {
    if (animate !== 'breathe') return;
    if (isRunning) {
      setBreathPhase('inhale');
      breathRef.current = setInterval(() => {
        setBreathPhase(p => (p === 'inhale' ? 'exhale' : 'inhale'));
      }, 5000);
    } else {
      if (breathRef.current) clearInterval(breathRef.current);
      breathRef.current = null;
    }
    return () => { if (breathRef.current) clearInterval(breathRef.current); };
  }, [animate, isRunning]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (breathRef.current) clearInterval(breathRef.current);
  }, []);

  const toggle = () => {
    if (isComplete) return;
    if (isRunning) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      setIsRunning(false);
    } else {
      setIsRunning(true);
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    }
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (breathRef.current) clearInterval(breathRef.current);
    intervalRef.current = null;
    breathRef.current = null;
    setIsRunning(false);
  };

  const reset = () => {
    stop();
    setElapsed(0);
    setIsComplete(false);
    setBreathPhase('inhale');
  };

  const confirm = () => {
    stop();
    onComplete(elapsed);
  };

  const openManual = () => {
    stop();
    setManualValue(elapsed > 0 ? String(elapsed) : '');
    setIsManual(true);
  };

  const closeManual = () => {
    setIsManual(false);
    setBreathPhase('inhale');
  };

  const manualSeconds = parseInt(manualValue, 10);
  const manualIsValid = Number.isFinite(manualSeconds) && manualSeconds > 0;

  const submitManual = () => {
    if (!manualIsValid) return;
    onComplete(manualSeconds);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const display = mode === 'countdown' ? fmt(Math.max(0, targetSeconds - elapsed)) : fmt(elapsed);
  const progress = mode === 'countdown' ? Math.min(100, (elapsed / targetSeconds) * 100) : null;
  const currentTip = tips && tips.length > 0 && isRunning
    ? tips[Math.floor(elapsed / 60) % tips.length]
    : null;

  if (isManual) {
    return (
      <div className="flex flex-col items-center w-full">
        <span className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wider md:text-lg">{label}</span>
        <p className="text-sm text-gray-500 mb-6 text-center md:text-base">
          Enter the time you held for, in seconds
        </p>

        <div className="flex items-baseline gap-2 mb-6">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={600}
            step={1}
            className="text-5xl w-36 py-4 text-center border-2 border-blue-300 rounded-2xl font-mono font-bold text-gray-800 focus:border-blue-500 outline-none md:text-6xl md:w-44 md:py-5"
            placeholder="–"
            value={manualValue}
            autoFocus
            onChange={e => setManualValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitManual(); }}
          />
          <span className="text-lg font-semibold text-gray-400 md:text-xl">s</span>
        </div>

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

      {animate === 'breathe' && (
        <div className="flex flex-col items-center mb-3">
          <div className="w-20 h-20 flex items-center justify-center">
            <div
              className={`w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 transition-transform ease-in-out ${
                isRunning && breathPhase === 'inhale' ? 'scale-100' : 'scale-[0.55]'
              }`}
              style={{ transitionDuration: '5000ms' }}
            />
          </div>
          <p className="text-xs text-blue-400 mt-2 h-4 font-medium">
            {isRunning
              ? breathPhase === 'inhale' ? 'breathe in…' : 'breathe out…'
              : 'breathe gently through your nose'}
          </p>
        </div>
      )}

      {animate === 'hold' && (
        <div className="flex flex-col items-center mb-3">
          <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors duration-700 ${
            isRunning ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`w-4 h-4 rounded-full transition-colors duration-700 ${
              isRunning ? 'bg-amber-300 animate-pulse' : 'bg-gray-200'
            }`} />
          </div>
          <p className={`text-xs mt-2 h-4 font-medium transition-colors duration-700 ${isRunning ? 'text-amber-500' : 'text-gray-400'}`}>
            {isRunning ? 'holding…' : 'breathe out normally, then hold'}
          </p>
        </div>
      )}

      {instructions && !animate && !isRunning && elapsed === 0 && (
        <p className="text-sm text-gray-400 text-center mb-3 max-w-xs leading-relaxed">{instructions}</p>
      )}

      <div className={`text-7xl font-mono font-bold tabular-nums mb-1 md:text-8xl ${isComplete ? 'text-green-500' : 'text-gray-800'}`}>
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
              title="Record time"
            >
              <Check size={20} />
            </button>
          ) : (
            <button
              onClick={confirm}
              className="p-4 rounded-2xl bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors text-xs font-semibold md:p-5 md:text-sm"
              title="Stop early"
            >
              Stop
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
