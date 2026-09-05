import { describe, expect, it } from 'vitest';
import {
  newSessionId,
  normalizeEntries,
  normalizeEntry,
  TOMBSTONE_TTL_MS,
} from '@/lib/session';

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
      updatedAt: 1700000000000,
      deletedAt: null,
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
      updatedAt: 1700000000002,
      deletedAt: null,
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
      updatedAt: 1,
      deletedAt: null,
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
      updatedAt: 5,
      deletedAt: null,
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
      updatedAt: 6,
      deletedAt: null,
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

// Sync added `updatedAt` and `deletedAt` to every entry. Everything already in
// somebody's localStorage predates them, so the defaults are the whole of the
// migration — if these break, existing histories break with them.
describe('the sync fields on entries stored before sync existed', () => {
  it('dates an old entry from when the reading was taken', () => {
    const entry = normalizeEntry(legacy);
    expect(entry?.updatedAt).toBe(legacy.timestamp);
  });

  it('treats an old entry as not deleted', () => {
    expect(normalizeEntry(legacy)?.deletedAt).toBeNull();
  });

  it('keeps the fields when they are there', () => {
    const entry = normalizeEntry({ ...legacy, updatedAt: 1700000009999, deletedAt: 1700000005555 });
    expect(entry?.updatedAt).toBe(1700000009999);
    expect(entry?.deletedAt).toBe(1700000005555);
  });

  it('falls back rather than trusting a non-finite value', () => {
    const entry = normalizeEntry({ ...legacy, updatedAt: NaN, deletedAt: Infinity });
    expect(entry?.updatedAt).toBe(legacy.timestamp);
    expect(entry?.deletedAt).toBeNull();
  });

  it('does not drop an old entry for lacking them', () => {
    expect(normalizeEntries([legacy]).map(e => e.id)).toEqual(['abc']);
  });
});

describe('tombstones', () => {
  const now = 1800000000000;
  const tombstone = (deletedAt: number) => ({ ...legacy, id: 'gone', deletedAt });

  it('keeps a recent one, so the deletion can still reach another device', () => {
    const entries = normalizeEntries([tombstone(now - 1000)], now);
    expect(entries.map(e => e.id)).toEqual(['gone']);
  });

  it('forgets one older than the time to live', () => {
    expect(normalizeEntries([tombstone(now - TOMBSTONE_TTL_MS - 1)], now)).toEqual([]);
  });

  it('never forgets an entry that was not deleted', () => {
    const ancient = { ...legacy, timestamp: 1 };
    expect(normalizeEntries([ancient], now).map(e => e.id)).toEqual(['abc']);
  });
});

describe('newSessionId', () => {
  it('does not collide within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, newSessionId));
    expect(ids.size).toBe(1000);
  });
});
