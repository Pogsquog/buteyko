/**
 * A short chime plus a vibration when a countdown ends, so the end of an
 * exercise is noticeable with the phone face-down or in a pocket.
 *
 * The AudioContext has to be created from a user gesture (the Start tap), which
 * is what `primeAlarm` is for — by the time the countdown ends there may be no
 * gesture to hang it off.
 */

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

/** Call from a user gesture so the alarm can sound later without one. */
export function primeAlarm() {
  const Ctor = audioContextCtor();
  if (!Ctor) return;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

function beep(at: number, frequency: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  // Ramped rather than switched, so the chime doesn't click.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.4);
}

export function playAlarm() {
  try {
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    if (ctx) {
      const now = ctx.currentTime;
      beep(now, 880);
      beep(now + 0.45, 1174.7);
    }
  } catch {
    // Audio is a nicety; never let it break the flow.
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([250, 120, 250]);
  }
}
