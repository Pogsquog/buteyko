import { describe, expect, it } from 'vitest';
import { clampPulseLeadIn, DEFAULT_PULSE_LEAD_IN, MAX_PULSE_LEAD_IN } from '@/lib/pulseLeadIn';

describe('clampPulseLeadIn', () => {
  it('keeps a valid number of seconds, including none', () => {
    expect(clampPulseLeadIn(0)).toBe(0);
    expect(clampPulseLeadIn(10)).toBe(10);
    expect(clampPulseLeadIn(7)).toBe(7);
  });

  it('rounds and clamps into range', () => {
    expect(clampPulseLeadIn(3.6)).toBe(4);
    expect(clampPulseLeadIn(-5)).toBe(0);
    expect(clampPulseLeadIn(1000)).toBe(MAX_PULSE_LEAD_IN);
  });

  it('falls back to the default for anything that is not a number', () => {
    expect(clampPulseLeadIn('10')).toBe(DEFAULT_PULSE_LEAD_IN);
    expect(clampPulseLeadIn(null)).toBe(DEFAULT_PULSE_LEAD_IN);
    expect(clampPulseLeadIn(NaN)).toBe(DEFAULT_PULSE_LEAD_IN);
    expect(clampPulseLeadIn({})).toBe(DEFAULT_PULSE_LEAD_IN);
  });
});
