import { describe, expect, it } from 'vitest';
import { mergeEntries, pendingEntries } from '@/lib/sync/merge';
import { CPEntry, LogEntry } from '@/types';

interface Overrides {
  timestamp?: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

const cp = (id: string, overrides: Overrides = {}): CPEntry => {
  const { timestamp = 1_000, updatedAt = timestamp, deletedAt = null } = overrides;
  return {
    id,
    kind: 'cp',
    timestamp,
    cp: 20,
    activity: null,
    notes: '',
    updatedAt,
    deletedAt,
  };
};

const ids = (entries: LogEntry[]) => entries.map(e => e.id);

describe('mergeEntries', () => {
  it('keeps an entry only this device has', () => {
    expect(ids(mergeEntries([cp('local')], []))).toEqual(['local']);
  });

  it('takes an entry only the server has', () => {
    expect(ids(mergeEntries([], [cp('remote')]))).toEqual(['remote']);
  });

  // The second-device case: two histories that have never met must combine,
  // not replace each other.
  it('unions two disjoint histories', () => {
    const merged = mergeEntries([cp('a', { timestamp: 2 })], [cp('b', { timestamp: 1 })]);
    expect(ids(merged)).toEqual(['a', 'b']);
  });

  it('prefers the remote copy when it was changed more recently', () => {
    const merged = mergeEntries(
      [{ ...cp('x'), notes: 'mine', updatedAt: 10 }],
      [{ ...cp('x'), notes: 'theirs', updatedAt: 20 }],
    );
    expect(merged).toHaveLength(1);
    expect((merged[0] as CPEntry).notes).toBe('theirs');
  });

  it('keeps the local copy when it was changed more recently', () => {
    const merged = mergeEntries(
      [{ ...cp('x'), notes: 'mine', updatedAt: 30 }],
      [{ ...cp('x'), notes: 'theirs', updatedAt: 20 }],
    );
    expect((merged[0] as CPEntry).notes).toBe('mine');
  });

  it('lets a remote tombstone delete an entry that is still visible here', () => {
    const merged = mergeEntries(
      [cp('x', { updatedAt: 10 })],
      [cp('x', { updatedAt: 20, deletedAt: 20 })],
    );
    expect(merged[0].deletedAt).toBe(20);
  });

  it('does not resurrect a local tombstone from an older remote copy', () => {
    const merged = mergeEntries(
      [cp('x', { updatedAt: 30, deletedAt: 30 })],
      [cp('x', { updatedAt: 20 })],
    );
    expect(merged[0].deletedAt).toBe(30);
  });

  it('returns newest reading first, as the history screens expect', () => {
    const merged = mergeEntries(
      [cp('old', { timestamp: 1 }), cp('new', { timestamp: 3 })],
      [cp('mid', { timestamp: 2 })],
    );
    expect(ids(merged)).toEqual(['new', 'mid', 'old']);
  });

  it('is idempotent, so re-pulling a row it already has changes nothing', () => {
    const local = [cp('a'), cp('b', { timestamp: 2 })];
    expect(mergeEntries(mergeEntries(local, local), local)).toEqual(
      mergeEntries(local, local),
    );
  });
});

describe('pendingEntries', () => {
  it('owes everything when nothing has been settled', () => {
    expect(ids(pendingEntries([cp('a'), cp('b')], {}))).toEqual(['a', 'b']);
  });

  it('owes nothing once each entry is settled at its current version', () => {
    const entries = [cp('a', { updatedAt: 5 })];
    expect(pendingEntries(entries, { a: 5 })).toEqual([]);
  });

  it('owes an entry again once it changes — which is how a delete propagates', () => {
    const deleted = cp('a', { updatedAt: 9, deletedAt: 9 });
    expect(ids(pendingEntries([deleted], { a: 5 }))).toEqual(['a']);
  });
});
