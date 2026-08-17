'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogs } from '@/hooks/useLogs';
import { useFormat } from '@/hooks/useFormat';
import { Timer } from '@/components/Timer';
import { PulseInput } from '@/components/PulseInput';
import { AlertCircle, Loader2, Save, Settings2, X } from 'lucide-react';
import { PauseType, SessionBlock, SessionFormat } from '@/types';
import { blocksForFormat, describeFormat } from '@/lib/sessionFormat';
import { fmtDuration } from '@/lib/time';
import { sequenceLabels, UNDECIDED_PAUSE } from '@/lib/sequence';
import { newSessionId } from '@/lib/session';

type Step =
  | { kind: 'INITIAL_PULSE' }
  | { kind: 'INITIAL_CP' }
  | { kind: 'RB'; block: number }
  | { kind: 'REST'; block: number }
  | { kind: 'PAUSE_TYPE'; block: number }
  | { kind: 'PAUSE'; block: number }
  | { kind: 'FINAL_PULSE' }
  | { kind: 'NOTES' };

/**
 * P / CP / (RB / rest / CP·EP) × n / P. The pause closing the last block is
 * always a CP, so only the earlier blocks ask which kind of pause to take.
 */
function buildSteps(format: SessionFormat): Step[] {
  const steps: Step[] = [{ kind: 'INITIAL_PULSE' }, { kind: 'INITIAL_CP' }];
  for (let block = 0; block < format.blocks; block++) {
    steps.push({ kind: 'RB', block });
    if (format.restDuration > 0) steps.push({ kind: 'REST', block });
    if (block < format.blocks - 1) steps.push({ kind: 'PAUSE_TYPE', block });
    steps.push({ kind: 'PAUSE', block });
  }
  steps.push({ kind: 'FINAL_PULSE' }, { kind: 'NOTES' });
  return steps;
}

/** Position of a step in the P / CP / RB / … / P indicator (-1 = outside the sequence). */
function seqIndexOf(step: Step, blockCount: number): number {
  switch (step.kind) {
    case 'INITIAL_PULSE': return 0;
    case 'INITIAL_CP': return 1;
    case 'RB':
    case 'REST': return 2 + step.block * 2;
    case 'PAUSE_TYPE':
    case 'PAUSE': return 3 + step.block * 2;
    case 'FINAL_PULSE': return 2 + blockCount * 2;
    case 'NOTES': return -1;
  }
}

const RB_TIPS = [
  'Breathe gently through your nose, keeping the volume slightly smaller than feels natural. Your breathing should be quiet and barely visible.',
  'CO₂ is not just a waste gas — it triggers the Bohr effect: higher CO₂ allows haemoglobin to release oxygen to your tissues more readily.',
  'A mild feeling of air hunger is normal and intentional. It signals CO₂ is rising, which is exactly the goal of this exercise.',
  'Nasal breathing produces nitric oxide in the sinuses, which dilates airways and blood vessels. Mouth breathing bypasses this completely.',
  'The Control Pause (CP) is a proxy for your CO₂ tolerance. Under 20 s suggests chronic over-breathing; 40 s+ is considered a healthy baseline.',
  'A clinical trial published in the BMJ (Cooper et al., 2003) found Buteyko significantly reduced reliever inhaler use and improved quality-of-life scores.',
  'Chronic over-breathing lowers CO₂, which constricts blood vessels and causes haemoglobin to grip oxygen more tightly — the opposite of what the body needs.',
  'Reduced breathing gradually raises your CO₂ threshold, so your brain becomes less likely to trigger a deep-breath urge in everyday life.',
  'Research (McHugh et al., 2003) found Buteyko practice reduced daily symptoms and improved overall breathing comfort within weeks of starting.',
  'Consistency matters more than duration. Regular short sessions build tolerance faster than occasional long ones.',
];

export default function NewSessionPage() {
  const { format: savedFormat, isLoaded } = useFormat();

  // The saved format decides how many steps there are, so the flow cannot be
  // built until localStorage has been read. The frame is drawn either way, so
  // the first paint is the app rather than a blank screen.
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-md mx-auto md:max-w-xl">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 min-h-[380px] flex items-center justify-center md:p-12 md:min-h-[460px]">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        </div>
      </div>
    );
  }

  return <SessionFlow format={savedFormat} />;
}

function SessionFlow({ format: initialFormat }: { format: SessionFormat }) {
  const router = useRouter();
  const { saveLog } = useLogs();

  // Pinned at mount: changing the format mid-session would reshuffle the steps
  // underneath whatever has already been recorded.
  const [format] = useState(initialFormat);
  const steps = useMemo(() => buildSteps(format), [format]);

  const [currentStep, setCurrentStep] = useState(0);
  const [initialPulse, setInitialPulse] = useState<number | undefined>();
  const [finalPulse, setFinalPulse] = useState<number | undefined>();
  const [initialCP, setInitialCP] = useState(0);
  const [notes, setNotes] = useState('');
  const [blocks, setBlocks] = useState<SessionBlock[]>(() => blocksForFormat(format));
  const [isSaving, setIsSaving] = useState(false);
  const [saveIsSlow, setSaveIsSlow] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // A ref, not the state above: two taps in the same tick both read the old
  // state, but the ref is already set by the time the second one runs.
  const savingRef = useRef(false);

  const step = steps[currentStep];
  const seqIndex = seqIndexOf(step, format.blocks);

  // Both moves are anchored to the step the handler was rendered for, so a
  // double-tap that fires twice before React re-renders moves one step, not two
  // — otherwise a stray second tap silently skips past a measurement.
  const next = () =>
    setCurrentStep(s => (s === currentStep ? Math.min(s + 1, steps.length - 1) : s));
  const back = () =>
    setCurrentStep(s => (s === currentStep ? Math.max(s - 1, 0) : s));

  const updateBlock = (index: number, patch: Partial<SessionBlock>) =>
    setBlocks(bs => bs.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  // A block's pause shows as "CP/EP" until its type has been picked, then as
  // whichever was chosen.
  const typeDecided = (block: number) =>
    currentStep >= steps.findIndex(s => s.kind === 'PAUSE' && s.block === block);

  const labels = sequenceLabels(blocks.length, (i, isLast) =>
    typeDecided(i) || isLast ? blocks[i].pauseType : UNDECIDED_PAUSE,
  );

  const handleSave = () => {
    if (savingRef.current) return; // an impatient second tap would save twice
    savingRef.current = true;
    setIsSaving(true);
    setSaveFailed(false);

    const saved = saveLog({
      id: newSessionId(),
      timestamp: Date.now(),
      initialPulse: initialPulse ?? 0,
      initialCP,
      blocks,
      finalPulse: finalPulse ?? 0,
      notes,
    });

    // A full quota or Safari's private mode rejects the write. Leaving the
    // button spinning would strand a finished session behind a dead screen.
    if (!saved) {
      savingRef.current = false;
      setIsSaving(false);
      setSaveFailed(true);
      return;
    }

    // replace(): the finished session should not be somewhere Back can return to.
    router.replace('/');
  };

  // The save itself is instant (localStorage); it is the navigation back to the
  // history that can drag on a slow connection, so warm it up beforehand and
  // say so if it takes long enough to look broken.
  useEffect(() => {
    if (step.kind === 'NOTES') router.prefetch('/');
  }, [step.kind, router]);

  useEffect(() => {
    if (!isSaving) return;
    const id = setTimeout(() => setSaveIsSlow(true), 4000);
    return () => clearTimeout(id);
  }, [isSaving]);

  const blockLabel = (index: number) =>
    format.blocks > 1 ? ` (${index + 1} of ${format.blocks})` : '';

  const renderStep = () => {
    switch (step.kind) {
      case 'INITIAL_PULSE':
        return (
          <PulseInput
            key="initial-pulse"
            label="Initial Pulse"
            value={initialPulse}
            onChange={setInitialPulse}
            onNext={next}
          />
        );
      case 'INITIAL_CP':
        return (
          <Timer
            key="initial-cp"
            label="Control Pause"
            mode="stopwatch"
            animate="hold"
            allowManualEntry
            instructions="After a normal exhale, pinch your nose. Time until the first gentle urge to breathe — don't push through discomfort."
            onComplete={v => { setInitialCP(v); next(); }}
          />
        );
      case 'RB': {
        const index = step.block;
        return (
          <Timer
            key={`rb-${index}`}
            label={`Reduced Breathing${blockLabel(index)}`}
            mode="countdown"
            targetSeconds={format.rbDuration}
            animate="breathe"
            tips={RB_TIPS}
            allowManualEntry
            onComplete={v => { updateBlock(index, { rbDuration: v }); next(); }}
          />
        );
      }
      case 'REST':
        return (
          <Timer
            key={`rest-${step.block}`}
            label="Regular Breathing"
            mode="countdown"
            targetSeconds={format.restDuration}
            animate="rest"
            autoStart
            stopLabel="Skip"
            instructions="Let your breathing return to normal before the next pause."
            onComplete={next}
          />
        );
      case 'PAUSE_TYPE': {
        const index = step.block;
        return (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 md:text-3xl">Pause Type</h2>
            <p className="text-sm text-gray-500 mb-8 text-center md:text-base">
              Select the type of pause for this exercise set
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              {(['CP', 'EP'] as PauseType[]).map(type => (
                <button
                  key={type}
                  onClick={() => { updateBlock(index, { pauseType: type }); next(); }}
                  className={`p-8 rounded-2xl border-2 font-bold text-2xl active:scale-95 transition-transform md:text-3xl md:p-10 ${
                    blocks[index].pauseType === type
                      ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {type}
                  <p className={`text-xs font-normal mt-1 md:text-sm ${
                    blocks[index].pauseType === type ? 'text-blue-500' : 'text-gray-500'
                  }`}>
                    {type === 'CP' ? 'Control Pause' : 'Extended Pause'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      }
      case 'PAUSE': {
        const index = step.block;
        const isFinal = index === blocks.length - 1;
        const type = isFinal ? 'CP' : blocks[index].pauseType;
        return (
          <Timer
            key={`pause-${index}`}
            label={isFinal ? 'Final Control Pause' : `${type} Pause`}
            mode="stopwatch"
            animate="hold"
            allowManualEntry
            instructions={
              type === 'EP'
                ? 'After exhaling, hold until you feel a medium-strong air hunger — noticeably more discomfort than a CP.'
                : 'After a normal exhale, pinch your nose and hold until the first gentle urge to breathe.'
            }
            onComplete={v => { updateBlock(index, { pauseType: type, pauseValue: v }); next(); }}
          />
        );
      }
      case 'FINAL_PULSE':
        return (
          <PulseInput
            key="final-pulse"
            label="Final Pulse"
            value={finalPulse}
            onChange={setFinalPulse}
            onNext={next}
          />
        );
      case 'NOTES':
        return (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 md:text-3xl">Notes</h2>
            <p className="text-sm text-gray-500 mb-6 text-center md:text-base">
              Medication, physical condition, anything notable
            </p>
            <textarea
              className="w-full h-32 p-4 border-2 border-gray-200 rounded-2xl mb-6 focus:border-blue-500 outline-none resize-none text-gray-700 md:h-40 md:text-base"
              placeholder={`e.g. RB ${fmtDuration(format.rbDuration)} @ 18:00, felt congested...`}
              defaultValue={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-blue-700 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 md:text-lg md:py-5"
            >
              {isSaving
                ? <><Loader2 size={20} className="animate-spin" /> Saving…</>
                : <><Save size={20} /> Save Session</>
              }
            </button>
            {saveIsSlow && !saveFailed && (
              <p className="mt-3 text-xs text-gray-400 text-center md:text-sm">
                Session saved — still opening your history…
              </p>
            )}
            {saveFailed && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-red-500 text-center md:text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Could not save — your browser refused to write to storage. Free up space
                  or leave private browsing, then try again.
                </span>
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-md mx-auto md:max-w-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/')} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={24} />
          </button>
          <span className="text-sm font-semibold text-gray-500 md:text-base">
            {currentStep + 1} / {steps.length}
          </span>
          <div className="w-10" />
        </div>

        {/* Sequence indicator */}
        {seqIndex >= 0 && (
          <div className="flex items-center mb-6 px-1 overflow-x-auto">
            {labels.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors md:w-10 md:h-10 md:text-sm ${
                      i < seqIndex
                        ? 'bg-blue-200 text-blue-600'
                        : i === seqIndex
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i < seqIndex ? '✓' : label.split('/')[0]}
                  </div>
                  <span className={`text-[10px] font-semibold md:text-xs ${i === seqIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < labels.length - 1 && (
                  <div className={`flex-1 min-w-[8px] h-px mx-1 ${i < seqIndex ? 'bg-blue-200' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step card */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 min-h-[380px] flex items-center justify-center md:p-12 md:min-h-[460px]">
          {renderStep()}
        </div>

        {/* Footer: format summary on the first step, back button after that */}
        <div className="mt-6 flex justify-between items-center gap-4">
          {currentStep > 0 && step.kind !== 'NOTES' ? (
            <button
              onClick={back}
              className="text-sm text-gray-400 hover:text-gray-600 font-medium md:text-base"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          {currentStep === 0 && (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium md:text-sm"
            >
              <Settings2 size={14} /> {describeFormat(format)}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
