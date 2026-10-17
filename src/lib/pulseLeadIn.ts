/**
 * The countdown before a hand-counted pulse starts, in seconds: time to put
 * the phone down and find the pulse before the count window opens.
 */
export const DEFAULT_PULSE_LEAD_IN = 5;
export const MAX_PULSE_LEAD_IN = 60;

/** Common lead-in lengths, in seconds. 0 starts the count straight away. */
export const PULSE_LEAD_IN_PRESETS = [0, 5, 10, 15];

/**
 * Takes `unknown` because it reads whatever JSON is in localStorage. Anything
 * unusable falls back to the default rather than failing.
 */
export function clampPulseLeadIn(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PULSE_LEAD_IN;
  return Math.min(MAX_PULSE_LEAD_IN, Math.max(0, Math.round(value)));
}
