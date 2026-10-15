import { describe, expect, it } from 'vitest';
import { setShareText } from '@/lib/shareText';
import { Session } from '@/types';

const session = (overrides: Partial<Session> = {}): Session => ({
  id: 'a',
  kind: 'set',
  timestamp: 0,
  updatedAt: 0,
  deletedAt: null,
  notes: '',
  initialPulse: 72,
  initialCP: 25,
  blocks: [
    { rbDuration: 600, pauseType: 'EP', pauseValue: 32 },
    { rbDuration: 600, pauseType: 'CP', pauseValue: 35 },
  ],
  finalPulse: 68,
  ...overrides,
});

describe('setShareText', () => {
  it('lays a set out as pulse / CP / RB / pause / RB / CP / pulse', () => {
    expect(setShareText(session())).toBe('72 / 25 / 10 / 32 / 10 / 35 / 68');
  });

  it('gives RB in minutes, keeping a half minute', () => {
    const blocks = [{ rbDuration: 450, pauseType: 'CP' as const, pauseValue: 30 }];
    expect(setShareText(session({ blocks }))).toBe('72 / 25 / 7.5 / 30 / 68');
  });

  it('follows the number of blocks in the set', () => {
    const blocks = Array.from({ length: 3 }, () => ({ rbDuration: 300, pauseType: 'CP' as const, pauseValue: 20 }));
    expect(setShareText(session({ blocks }))).toBe('72 / 25 / 5 / 20 / 5 / 20 / 5 / 20 / 68');
  });
});
