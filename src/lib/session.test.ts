import { describe, expect, it } from 'vitest';
import { newSessionId, normalizeEntries, normalizeEntry } from '@/lib/session';

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

describe('normalizeEntry', () => {
  it('migrates a legacy two-block session into blocks, keeping every reading', () => {
    const session = normalizeEntry(legacy);

    expect(session).toEqual({
      id: 'abc',
      kind: 'set',
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
    const session = normalizeEntry(legacy);
    expect(session?.kind === 'set' && session.blocks.at(-1)?.pauseType).toBe('CP');
  });

  it('passes a current-shape session through unchanged', () => {
    const current = {
      id: 'xyz',
      kind: 'set' as const,
      timestamp: 1700000000001,
      initialPulse: 70,
      initialCP: 20,
      blocks: [{ rbDuration: 300, pauseType: 'CP', pauseValue: 25 }],
      finalPulse: 66,
      notes: '',
    };
    expect(normalizeEntry(current)).toEqual(current);
  });

  it('rejects anything without an id and timestamp', () => {
    expect(normalizeEntry(null)).toBeNull();
    expect(normalizeEntry('a string')).toBeNull();
    expect(normalizeEntry({})).toBeNull();
    expect(normalizeEntry({ id: 'a' })).toBeNull();
    expect(normalizeEntry({ timestamp: 1 })).toBeNull();
    expect(normalizeEntry({ id: 1, timestamp: 1 })).toBeNull();
  });

  it('substitutes zero for readings that are missing or not finite', () => {
    const session = normalizeEntry({
      id: 'a',
      timestamp: 1,
      initialPulse: 'sixty',
      blocks: [{ rbDuration: Number.NaN, pauseType: 'nonsense', pauseValue: undefined }],
    });

    expect(session).toEqual({
      id: 'a',
      kind: 'set',
      timestamp: 1,
      initialPulse: 0,
      initialCP: 0,
      blocks: [{ rbDuration: 0, pauseType: 'CP', pauseValue: 0 }],
      finalPulse: 0,
      notes: '',
    });
  });

  it('treats a session with no blocks at all as an empty set rather than dropping it', () => {
    expect(asSet(normalizeEntry({ id: 'a', timestamp: 1 })).blocks).toEqual([]);
    expect(asSet(normalizeEntry({ id: 'a', timestamp: 1, blocks: 'not an array' })).blocks).toEqual([]);
  });

  it('reads an entry with no kind as a full set, which is all there used to be', () => {
    expect(normalizeEntry({ id: 'a', timestamp: 1 })?.kind).toBe('set');
  });

  it('keeps a lone CP with the activity it was taken around', () => {
    expect(
      normalizeEntry({
        id: 'c',
        kind: 'cp',
        timestamp: 5,
        cp: 24,
        activity: { relation: 'after', kind: 'food', detail: 'lunch' },
        notes: 'n',
      }),
    ).toEqual({
      id: 'c',
      kind: 'cp',
      timestamp: 5,
      cp: 24,
      activity: { relation: 'after', kind: 'food', detail: 'lunch' },
      notes: 'n',
    });
  });

  it('drops an activity it cannot make sense of rather than half-filling one', () => {
    const withJunk = normalizeEntry({ id: 'c', kind: 'cp', timestamp: 5, cp: 24, activity: { kind: 'sleeping' } });
    expect(withJunk).toMatchObject({ kind: 'cp', activity: null });
    expect(normalizeEntry({ id: 'c', kind: 'cp', timestamp: 5, cp: 24 })).toMatchObject({ activity: null });
  });

  it('defaults an activity with no usable relation to "after"', () => {
    expect(
      normalizeEntry({ id: 'c', kind: 'cp', timestamp: 5, cp: 1, activity: { kind: 'other' } }),
    ).toMatchObject({ activity: { relation: 'after', kind: 'other', detail: '' } });
  });

  it('keeps a lone RB block', () => {
    expect(normalizeEntry({ id: 'r', kind: 'rb', timestamp: 6, rbDuration: 600 })).toEqual({
      id: 'r',
      kind: 'rb',
      timestamp: 6,
      rbDuration: 600,
      notes: '',
    });
  });
});

/** Narrows for the assertions above, which would otherwise have to test the kind first. */
function asSet(entry: ReturnType<typeof normalizeEntry>) {
  if (entry?.kind !== 'set') throw new Error('expected a full set');
  return entry;
}

describe('normalizeEntries', () => {
  it('keeps the readable entries and drops the rest', () => {
    const sessions = normalizeEntries([legacy, null, { junk: true }, { id: 'b', timestamp: 2 }]);
    expect(sessions.map(s => s.id)).toEqual(['abc', 'b']);
  });

  it('returns nothing for a stored value that is not a list', () => {
    expect(normalizeEntries({})).toEqual([]);
    expect(normalizeEntries(null)).toEqual([]);
    expect(normalizeEntries(undefined)).toEqual([]);
  });
});

describe('newSessionId', () => {
  it('does not collide within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, newSessionId));
    expect(ids.size).toBe(1000);
  });
});
