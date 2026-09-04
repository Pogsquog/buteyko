'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { useLogs } from '@/hooks/useLogs';
import { Timer } from '@/components/Timer';
import { FlowShell } from '@/components/FlowShell';
import { ActivityContext, ActivityKind, ActivityRelation } from '@/types';
import { ACTIVITY_KINDS, ACTIVITY_RELATIONS } from '@/lib/activity';
import { newSessionId } from '@/lib/session';
import { fmtSeconds } from '@/lib/time';

/**
 * A control pause taken on its own — measured first, then given whatever
 * context is worth recording. A CP read after a meal or a flight of stairs
 * means something different from one read cold, so the reading can say which.
 */
export default function LogCPPage() {
  const router = useRouter();
  const { saveLog } = useLogs();

  const [cp, setCP] = useState<number | null>(null);
  const [relation, setRelation] = useState<ActivityRelation | null>(null);
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [detail, setDetail] = useState('');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // A ref, not the state above: two taps in the same tick both read the old
  // state, but the ref is already set by the time the second one runs.
  const savingRef = useRef(false);

  // The save itself is instant (localStorage); it is the navigation back to the
  // history that can drag on a slow connection.
  useEffect(() => {
    if (cp !== null) router.prefetch('/');
  }, [cp, router]);

  // Both halves of the context are needed for it to say anything, so a
  // half-filled one is recorded as no context at all.
  const activity: ActivityContext | null =
    relation !== null && kind !== null ? { relation, kind, detail } : null;

  const handleSave = async () => {
    if (savingRef.current) return; // an impatient second tap would save twice
    savingRef.current = true;
    setIsSaving(true);
    setSaveFailed(false);

    const saved = await saveLog({
      id: newSessionId(),
      kind: 'cp',
      timestamp: Date.now(),
      cp: cp ?? 0,
      activity,
      notes,
    });

    // A full quota or Safari's private mode rejects the write. Leaving the
    // button spinning would strand a finished reading behind a dead screen.
    if (!saved) {
      savingRef.current = false;
      setIsSaving(false);
      setSaveFailed(true);
      return;
    }

    // replace(): the finished reading should not be somewhere Back can return to.
    router.replace('/');
  };

  return (
    <FlowShell
      heading={cp === null ? 'Control Pause' : 'Details'}
      onClose={() => router.push('/')}
      footer={
        cp !== null ? (
          <button
            onClick={() => setCP(null)}
            className="text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 font-medium md:text-base"
          >
            ← Measure again
          </button>
        ) : undefined
      }
    >
      {cp === null ? (
        <Timer
          label="Control Pause"
          mode="stopwatch"
          animate="hold"
          allowManualEntry
          instructions="After a normal exhale, pinch your nose. Time until the first gentle urge to breathe — don't push through discomfort."
          onComplete={setCP}
        />
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="text-6xl font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400 mb-1 md:text-7xl">
            {fmtSeconds(cp)}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 text-center md:text-base">
            Tie this reading to an activity, if it was around one.
          </p>

          <div className="w-full mb-5">
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Taken
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_RELATIONS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  // Tapping the chosen one again clears it: the context is optional.
                  selected={relation === option.value}
                  onClick={() => setRelation(r => (r === option.value ? null : option.value))}
                />
              ))}
            </div>
          </div>

          <div className="w-full mb-5">
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Activity
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_KINDS.map(option => (
                <Chip
                  key={option.value}
                  label={option.label}
                  hint={option.hint}
                  selected={kind === option.value}
                  onClick={() => setKind(k => (k === option.value ? null : option.value))}
                />
              ))}
            </div>
          </div>

          {kind !== null && (
            <input
              type="text"
              aria-label="What the activity was"
              className="w-full p-3 border-2 border-gray-200 dark:border-slate-700 rounded-2xl mb-5 focus:border-blue-500 outline-none text-gray-700 dark:text-slate-200 dark:bg-slate-800 md:text-base"
              placeholder={kind === 'other' ? 'What was it?' : 'Anything more specific? (optional)'}
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
          )}

          <textarea
            aria-label="Notes"
            className="w-full h-20 p-3 border-2 border-gray-200 dark:border-slate-700 rounded-2xl mb-6 focus:border-blue-500 outline-none resize-none text-gray-700 dark:text-slate-200 dark:bg-slate-800 md:text-base"
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
              : <><Save size={20} /> Save CP</>
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

interface ChipProps {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}

function Chip({ label, hint, selected, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`py-3 px-2 rounded-xl border-2 font-bold text-sm transition-colors md:text-base ${
        selected
          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
          : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
      }`}
    >
      {label}
      {hint && (
        <span className={`block text-[10px] font-normal mt-0.5 md:text-xs ${
          selected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
        }`}>
          {hint}
        </span>
      )}
    </button>
  );
}
