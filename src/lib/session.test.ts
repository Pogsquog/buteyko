import { describe, expect, it } from 'vitest';
import { newSessionId, normalizeSession, normalizeSessions } from '@/lib/session';

/** A session in the pre-configurable-format shape. */
const legacy = {
  id: 'abc',
  timestamp: 1700000000000,
  initialPulse: 68,
  initialCP: 21,
  rb1Duration: 600,
  intermediateValue: 24,
  intermediateType: 'EP',
  rb2Duration: 600,
  finalCP: 29,
  finalPulse: 64,
  notes: 'felt congested',
};

describe('normalizeSession', () => {
  it('migrates a legacy two-block session into blocks, keeping every reading', () => {
    const session = normalizeSession(legacy);

    expect(session).toEqual({
      id: 'abc',
      timestamp: 1700000000000,
      initialPulse: 68,
      initialCP: 21,
      blocks: [
        { rbDuration: 600, pauseType: 'EP', pauseValue: 24 },
        { rbDuration: 600, pauseType: 'CP', pauseValue: 29 },
      ],
      finalPulse: 64,
      notes: 'felt congested',
    });
  });

  it('closes a legacy session with a CP even if the stored intermediate was an EP', () => {
    const session = normalizeSession(legacy);
    expect(session?.blocks.at(-1)?.pauseType).toBe('CP');
  });

  it('passes a current-shape session through unchanged', () => {
    const current = {
      id: 'xyz',
      timestamp: 1700000000001,
      initialPulse: 70,
      initialCP: 20,
      blocks: [{ rbDuration: 300, pauseType: 'CP', pauseValue: 25 }],
      finalPulse: 66,
      notes: '',
    };
    expect(normalizeSession(current)).toEqual(current);
  });

  it('rejects anything without an id and timestamp', () => {
    expect(normalizeSession(null)).toBeNull();
    expect(normalizeSession('a string')).toBeNull();
    expect(normalizeSession({})).toBeNull();
    expect(normalizeSession({ id: 'a' })).toBeNull();
    expect(normalizeSession({ timestamp: 1 })).toBeNull();
    expect(normalizeSession({ id: 1, timestamp: 1 })).toBeNull();
  });

  it('substitutes zero for readings that are missing or not finite', () => {
    const session = normalizeSession({
      id: 'a',
      timestamp: 1,
      initialPulse: 'sixty',
      blocks: [{ rbDuration: Number.NaN, pauseType: 'nonsense', pauseValue: undefined }],
    });

    expect(session).toEqual({
      id: 'a',
      timestamp: 1,
      initialPulse: 0,
      initialCP: 0,
      blocks: [{ rbDuration: 0, pauseType: 'CP', pauseValue: 0 }],
      finalPulse: 0,
      notes: '',
    });
  });

  it('treats a session with no blocks at all as an empty set rather than dropping it', () => {
    expect(normalizeSession({ id: 'a', timestamp: 1 })?.blocks).toEqual([]);
    expect(normalizeSession({ id: 'a', timestamp: 1, blocks: 'not an array' })?.blocks).toEqual([]);
  });
});

describe('normalizeSessions', () => {
  it('keeps the readable entries and drops the rest', () => {
    const sessions = normalizeSessions([legacy, null, { junk: true }, { id: 'b', timestamp: 2 }]);
    expect(sessions.map(s => s.id)).toEqual(['abc', 'b']);
  });

  it('returns nothing for a stored value that is not a list', () => {
    expect(normalizeSessions({})).toEqual([]);
    expect(normalizeSessions(null)).toEqual([]);
    expect(normalizeSessions(undefined)).toEqual([]);
  });
});

describe('newSessionId', () => {
  it('does not collide within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, newSessionId));
    expect(ids.size).toBe(1000);
  });
});
