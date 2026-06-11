'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, Check } from 'lucide-react';

interface TimerProps {
  onComplete: (seconds: number) => void;
  label: string;
  mode?: 'stopwatch' | 'countdown';
  targetSeconds?: number;
}

export const Timer: React.FC<TimerProps> = ({
  onComplete,
  label,
  mode = 'stopwatch',
  targetSeconds = 600,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode === 'countdown' && isRunning && elapsed >= targetSeconds) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      setIsRunning(false);
      setIsComplete(true);
    }
  }, [elapsed, mode, targetSeconds, isRunning]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

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

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setElapsed(0);
    setIsComplete(false);
  };

  const confirm = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    onComplete(elapsed);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const display = mode === 'countdown' ? fmt(Math.max(0, targetSeconds - elapsed)) : fmt(elapsed);
  const progress = mode === 'countdown' ? Math.min(100, (elapsed / targetSeconds) * 100) : null;

  return (
    <div className="flex flex-col items-center w-full">
      <span className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">{label}</span>

      {progress !== null && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className={`text-7xl font-mono font-bold tabular-nums mb-1 ${isComplete ? 'text-green-500' : 'text-gray-800'}`}>
        {display}
      </div>
      <div className="h-6 mb-6 flex items-center">
        {isComplete && <span className="text-green-500 font-semibold text-sm tracking-wide uppercase">Complete!</span>}
      </div>

      {isComplete ? (
        <button
          onClick={confirm}
          className="bg-green-500 text-white px-10 py-4 rounded-2xl font-bold text-lg w-full hover:bg-green-600 active:scale-95 transition-transform"
        >
          Next Step
        </button>
      ) : (
        <div className="flex gap-3 w-full">
          <button
            onClick={reset}
            className="p-4 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={toggle}
            className={`flex-1 py-4 rounded-2xl font-bold text-base transition-colors flex items-center justify-center gap-2 ${
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
              className="p-4 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              title="Record time"
            >
              <Check size={20} />
            </button>
          ) : (
            <button
              onClick={confirm}
              className="p-4 rounded-2xl bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors text-xs font-semibold"
              title="Stop early"
            >
              Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
};
