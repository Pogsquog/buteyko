'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Play, Save } from 'lucide-react';
import { useLogs } from '@/hooks/useLogs';
import { Timer } from '@/components/Timer';
import { FlowShell } from '@/components/FlowShell';
import { ChoiceRow, CustomDuration } from '@/components/FormControls';
import {
  MAX_RB_DURATION,
  MIN_RB_DURATION,
  RB_PRESETS,
  STANDALONE_RB_DURATION,
} from '@/lib/sessionFormat';
import { newSessionId } from '@/lib/session';
import { fmtDuration } from '@/lib/time';
import { RB_TIPS } from '@/lib/tips';

const clampDuration = (seconds: number) =>
  Math.min(MAX_RB_DURATION, Math.max(MIN_RB_DURATION, seconds));

/**
 * Reduced breathing practised on its own, away from a set. The timer is the one
 * the set uses — same pacer, same tips, same manual entry — with the length
 * chosen up front rather than taken from the exercise-set format, since this is
 * not part of a set.
 */
export default function LogRBPage() {
  const router = useRouter();
  const { saveLog } = useLogs();

  const [target, setTarget] = useState(STANDALONE_RB_DURATION);
  const [stage, setStage] = useState<'choose' | 'run' | 'save'>('choose');
  const [practised, setPractised] = useState(0);
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // A ref, not the state above: two taps in the same tick both read the old
  // state, but the ref is already set by the time the second one runs.
  const savingRef = useRef(false);

  // The save itself is instant (localStorage); it is the navigation back to the
  // history that can drag on a slow connection.
  useEffect(() => {
    if (stage === 'save') router.prefetch('/');
  }, [stage, router]);

  const handleSave = async () => {
    if (savingRef.current) return; // an impatient second tap would save twice
    savingRef.current = true;
    setIsSaving(true);
    setSaveFailed(false);

    const saved = await saveLog({
      id: newSessionId(),
      kind: 'rb',
      timestamp: Date.now(),
      rbDuration: practised,
      notes,
    });

    // A full quota or Safari's private mode rejects the write. Leaving the
    // button spinning would strand a finished block behind a dead screen.
    if (!saved) {
      savingRef.current = false;
      setIsSaving(false);
      setSaveFailed(true);
      return;
    }

    // replace(): the finished block should not be somewhere Back can return to.
    router.replace('/');
  };

  const headings = { choose: 'Ready', run: 'Reduced Breathing', save: 'Done' };

  return (
    <FlowShell
      heading={headings[stage]}
      onClose={() => router.push('/')}
      footer={
        stage === 'choose' ? undefined : (
          <button
            onClick={() => setStage('choose')}
            className="text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 font-medium md:text-base"
          >
            ← Start over
          </button>
        )
      }
    >
      {stage === 'choose' ? (
        <div className="flex flex-col w-full">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-1 text-center md:text-3xl">
            Reduced Breathing
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 text-center md:text-base">
            How long are you practising for?
          </p>

          <ChoiceRow
            options={RB_PRESETS.map(seconds => ({ value: seconds, label: fmtDuration(seconds) }))}
            value={target}
            onChange={setTarget}
          />
          <CustomDuration
            label="Custom length"
            unit="min"
            valueSeconds={target}
            min={MIN_RB_DURATION}
            max={MAX_RB_DURATION}
            onChange={seconds => setTarget(clampDuration(seconds))}
          />

          <button
            onClick={() => setStage('run')}
            className="mt-8 flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 transition-transform md:text-lg md:py-5"
          >
            <Play size={20} className="ml-0.5" /> Start {fmtDuration(target)}
          </button>
        </div>
      ) : stage === 'run' ? (
        <Timer
          label="Reduced Breathing"
          mode="countdown"
          targetSeconds={target}
          animate="breathe"
          tips={RB_TIPS}
          allowManualEntry
          onComplete={seconds => { setPractised(seconds); setStage('save'); }}
        />
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="text-6xl font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400 mb-1 md:text-7xl">
            {fmtDuration(practised)}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 text-center md:text-base">
            of reduced breathing
          </p>

          <textarea
            aria-label="Notes"
            className="w-full h-24 p-3 border-2 border-gray-200 dark:border-slate-700 rounded-2xl mb-6 focus:border-blue-500 outline-none resize-none text-gray-700 dark:text-slate-200 dark:bg-slate-800 md:text-base"
            placeholder="Notes — medication, how you felt…"
            defaultValue={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 md:text-lg md:py-5"
          >
            {isSaving
              ? <><Loader2 size={20} className="animate-spin" /> Saving…</>
              : <><Save size={20} /> Save RB</>
            }
          </button>

          {saveFailed && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-red-500 dark:text-red-400 text-center md:text-sm">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                Could not save — your browser refused to write to storage. Free up space
                or leave private browsing, then try again.
              </span>
            </p>
          )}
        </div>
      )}
    </FlowShell>
  );
}
