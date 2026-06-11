'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogs } from '@/hooks/useLogs';
import { Timer } from '@/components/Timer';
import { Save, X, Bluetooth, Loader2 } from 'lucide-react';
import { Session } from '@/types';
import { useHeartRate } from '@/hooks/useHeartRate';

const STEPS = [
  'INITIAL_PULSE',
  'INITIAL_CP',
  'RB_1',
  'INTERMEDIATE_TYPE',
  'INTERMEDIATE_VALUE',
  'RB_2',
  'FINAL_CP',
  'FINAL_PULSE',
  'NOTES',
] as const;

type Step = typeof STEPS[number];

// Maps each step to its position in the P/CP/RB/CP/RB/CP/P sequence (0-indexed, -1 = outside sequence)
const STEP_TO_SEQ: Record<Step, number> = {
  INITIAL_PULSE: 0,
  INITIAL_CP: 1,
  RB_1: 2,
  INTERMEDIATE_TYPE: 3,
  INTERMEDIATE_VALUE: 3,
  RB_2: 4,
  FINAL_CP: 5,
  FINAL_PULSE: 6,
  NOTES: -1,
};
const SEQUENCE_LABELS = ['P', 'CP', 'RB', 'CP/EP', 'RB', 'CP', 'P'];

const RB_DURATION = 600; // 10 minutes

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
  const router = useRouter();
  const { saveLog } = useLogs();
  const [currentStep, setCurrentStep] = useState(0);
  const [session, setSession] = useState<Partial<Session>>({
    intermediateType: 'CP',
    rb1Duration: RB_DURATION,
    rb2Duration: RB_DURATION,
  });

  const stepName = STEPS[currentStep];
  const seqIndex = STEP_TO_SEQ[stepName];

  const next = () => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setCurrentStep(s => Math.max(s - 1, 0));

  const handleSave = () => {
    const fullSession: Session = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      initialPulse: session.initialPulse ?? 0,
      initialCP: session.initialCP ?? 0,
      rb1Duration: session.rb1Duration ?? RB_DURATION,
      intermediateType: session.intermediateType ?? 'CP',
      intermediateValue: session.intermediateValue ?? 0,
      rb2Duration: session.rb2Duration ?? RB_DURATION,
      finalCP: session.finalCP ?? 0,
      finalPulse: session.finalPulse ?? 0,
      notes: session.notes ?? '',
    };
    saveLog(fullSession);
    router.push('/');
  };

  const renderStep = () => {
    switch (stepName) {
      case 'INITIAL_PULSE':
        return (
          <PulseInput
            label="Initial Pulse"
            value={session.initialPulse}
            onChange={v => setSession(s => ({ ...s, initialPulse: v }))}
            onNext={() => next()}
          />
        );
      case 'INITIAL_CP':
        return (
          <Timer
            key="initial-cp"
            label="Control Pause"
            mode="stopwatch"
            animate="hold"
            instructions="After a normal exhale, pinch your nose. Time until the first gentle urge to breathe — don't push through discomfort."
            onComplete={v => { setSession(s => ({ ...s, initialCP: v })); next(); }}
          />
        );
      case 'RB_1':
        return (
          <Timer
            key="rb-1"
            label="Reduced Breathing"
            mode="countdown"
            targetSeconds={RB_DURATION}
            animate="breathe"
            tips={RB_TIPS}
            onComplete={v => { setSession(s => ({ ...s, rb1Duration: v })); next(); }}
          />
        );
      case 'INTERMEDIATE_TYPE':
        return (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 md:text-3xl">Pause Type</h2>
            <p className="text-sm text-gray-500 mb-8 text-center md:text-base">Select the type of pause for this exercise set</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => { setSession(s => ({ ...s, intermediateType: 'CP' })); next(); }}
                className="p-8 rounded-2xl border-2 border-blue-200 bg-blue-50 font-bold text-2xl text-blue-700 active:scale-95 transition-transform hover:border-blue-400 md:text-3xl md:p-10"
              >
                CP
                <p className="text-xs font-normal text-blue-500 mt-1 md:text-sm">Control Pause</p>
              </button>
              <button
                onClick={() => { setSession(s => ({ ...s, intermediateType: 'EP' })); next(); }}
                className="p-8 rounded-2xl border-2 border-gray-200 font-bold text-2xl text-gray-600 active:scale-95 transition-transform hover:border-gray-400 md:text-3xl md:p-10"
              >
                EP
                <p className="text-xs font-normal text-gray-500 mt-1 md:text-sm">Extended Pause</p>
              </button>
            </div>
          </div>
        );
      case 'INTERMEDIATE_VALUE':
        return (
          <Timer
            key="intermediate-value"
            label={`${session.intermediateType} Pause`}
            mode="stopwatch"
            animate="hold"
            instructions={
              session.intermediateType === 'EP'
                ? 'After exhaling, hold until you feel a medium-strong air hunger — noticeably more discomfort than a CP.'
                : 'After a normal exhale, pinch your nose and hold until the first urge to breathe.'
            }
            onComplete={v => { setSession(s => ({ ...s, intermediateValue: v })); next(); }}
          />
        );
      case 'RB_2':
        return (
          <Timer
            key="rb-2"
            label="Reduced Breathing"
            mode="countdown"
            targetSeconds={RB_DURATION}
            animate="breathe"
            tips={RB_TIPS}
            onComplete={v => { setSession(s => ({ ...s, rb2Duration: v })); next(); }}
          />
        );
      case 'FINAL_CP':
        return (
          <Timer
            key="final-cp"
            label="Final Control Pause"
            mode="stopwatch"
            animate="hold"
            instructions="After a normal exhale, pinch your nose and hold until the first gentle urge to breathe."
            onComplete={v => { setSession(s => ({ ...s, finalCP: v })); next(); }}
          />
        );
      case 'FINAL_PULSE':
        return (
          <PulseInput
            label="Final Pulse"
            value={session.finalPulse}
            onChange={v => setSession(s => ({ ...s, finalPulse: v }))}
            onNext={() => next()}
          />
        );
      case 'NOTES':
        return (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 md:text-3xl">Notes</h2>
            <p className="text-sm text-gray-500 mb-6 text-center md:text-base">Medication, physical condition, anything notable</p>
            <textarea
              className="w-full h-32 p-4 border-2 border-gray-200 rounded-2xl mb-6 focus:border-blue-500 outline-none resize-none text-gray-700 md:h-40 md:text-base"
              placeholder="e.g. RB 10 mins @ 18:00, felt congested..."
              defaultValue={session.notes}
              onChange={e => setSession(s => ({ ...s, notes: e.target.value }))}
            />
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-blue-700 active:scale-95 transition-transform md:text-lg md:py-5"
            >
              <Save size={20} /> Save Session
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-md mx-auto md:max-w-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/')} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
          <span className="text-sm font-semibold text-gray-500 md:text-base">
            {currentStep + 1} / {STEPS.length}
          </span>
          <div className="w-10" />
        </div>

        {/* Sequence indicator */}
        {seqIndex >= 0 && (
          <div className="flex items-center justify-between mb-6 px-1">
            {SEQUENCE_LABELS.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1">
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
                {i < SEQUENCE_LABELS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${i < seqIndex ? 'bg-blue-200' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step card */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 min-h-[380px] flex items-center justify-center md:p-12 md:min-h-[460px]">
          {renderStep()}
        </div>

        {/* Back button */}
        {currentStep > 0 && stepName !== 'NOTES' && (
          <div className="mt-6 flex justify-start">
            <button
              onClick={back}
              className="text-sm text-gray-400 hover:text-gray-600 font-medium md:text-base"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface PulseInputProps {
  label: string;
  value?: number;
  onChange: (v: number) => void;
  onNext: () => void;
}

function PulseInput({ label, value, onChange, onNext }: PulseInputProps) {
  const { read, state, isSupported, clearError } = useHeartRate();
  const isBusy = state.status === 'connecting' || state.status === 'reading';

  const handleBluetooth = async () => {
    const bpm = await read();
    if (bpm !== null) onChange(bpm);
  };

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

      {isSupported && (
        <button
          onClick={handleBluetooth}
          disabled={isBusy}
          className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6 transition-colors md:text-base"
        >
          {isBusy
            ? <><Loader2 size={15} className="animate-spin" /> {state.status === 'connecting' ? 'Connecting…' : 'Reading…'}</>
            : <><Bluetooth size={15} /> Read from device</>
          }
        </button>
      )}

      {state.status === 'error' && (
        <p className="text-xs text-red-500 mb-4 text-center max-w-xs">
          {state.message}{' '}
          <button onClick={clearError} className="underline">Dismiss</button>
        </p>
      )}

      {!isSupported && <div className="mb-6" />}

      <button
        onClick={onNext}
        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold w-full hover:bg-blue-700 active:scale-95 transition-transform md:text-lg md:py-5"
      >
        Next
      </button>
    </div>
  );
}
