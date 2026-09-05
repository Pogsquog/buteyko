import { describe, expect, it } from 'vitest';
import { backupFilename, BACKUP_FORMAT, fromBackup, toBackup } from '@/lib/backup';
import { CPEntry } from '@/types';

const cp = (id: string, deletedAt: number | null = null): CPEntry => ({
  id,
  kind: 'cp',
  timestamp: 1_000,
  cp: 20,
  activity: null,
  notes: '',
  updatedAt: 1_000,
  deletedAt,
});

describe('toBackup', () => {
  it('stamps the file so a reader knows what it is', () => {
    const backup = toBackup([], 12345);
    expect(backup).toMatchObject({ app: 'buteyko', format: BACKUP_FORMAT, exportedAt: 12345 });
  });

  // Otherwise restoring an old backup would undo every deletion made since.
  it('keeps tombstones, so a restore does not resurrect deleted readings', () => {
    const backup = toBackup([cp('gone', 900)]);
    expect(backup.entries[0].deletedAt).toBe(900);
  });
});

describe('backupFilename', () => {
  it('is dated, zero-padded, and sorts in a file list', () => {
    expect(backupFilename(new Date(2026, 8, 5))).toBe('buteyko-2026-09-05.json');
  });
});

describe('fromBackup', () => {
  it('round-trips what toBackup wrote', () => {
    const entries = [cp('a'), cp('b')];
    expect(fromBackup(JSON.parse(JSON.stringify(toBackup(entries))))).toEqual(entries);
  });

  it('accepts a bare array, which is what hand-editing tends to produce', () => {
    expect(fromBackup([cp('a')])).toEqual([cp('a')]);
  });

  it('migrates entries stored in older shapes, exactly as reading storage does', () => {
    const restored = fromBackup({
      entries: [{ id: 'old', timestamp: 5, initialPulse: 60, rb1Duration: 60,
                  intermediateValue: 20, intermediateType: 'EP', rb2Duration: 60,
                  finalCP: 25, finalPulse: 58 }],
    });
    expect(restored?.[0]).toMatchObject({ kind: 'set', updatedAt: 5, deletedAt: null });
  });

  it('recovers the readable entries from a damaged file rather than none', () => {
    expect(fromBackup({ entries: [cp('a'), null, { junk: true }] })?.map(e => e.id)).toEqual(['a']);
  });

  it('rejects a file that is not a backup at all', () => {
    expect(fromBackup(null)).toBeNull();
    expect(fromBackup('a string')).toBeNull();
    expect(fromBackup({ some: 'other json' })).toBeNull();
  });

  it('reads an empty backup as empty rather than as broken', () => {
    expect(fromBackup({ entries: [] })).toEqual([]);
  });
});
