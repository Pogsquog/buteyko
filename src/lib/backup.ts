import { LogEntry } from '@/types';
import { normalizeEntries } from '@/lib/session';

/**
 * Version of the file layout, not of the entries inside it. Entry shapes are
 * `normalizeEntry`'s business, and it already reads every shape this app has
 * ever written — so a file exported today will still restore after the entry
 * format moves on again.
 */
export const BACKUP_FORMAT = 1;

export interface Backup {
  app: 'buteyko';
  format: number;
  exportedAt: number;
  entries: LogEntry[];
}

/**
 * Tombstones are included deliberately. A backup taken after deleting a reading
 * and restored later should not bring it back from the dead.
 */
export function toBackup(entries: LogEntry[], now = Date.now()): Backup {
  return { app: 'buteyko', format: BACKUP_FORMAT, exportedAt: now, entries };
}

/** Sorts and reads sensibly in a file list: `buteyko-2026-09-05.json`. */
export function backupFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `buteyko-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads a backup, or returns null if the file is not one.
 *
 * Liberal about the wrapper — a bare array of entries is accepted too, since
 * that is what someone editing a file by hand tends to produce — but strict
 * about the entries, which go through the same `normalizeEntries` as anything
 * read from storage. Unreadable entries are dropped rather than failing the
 * whole import: recovering most of a damaged backup beats recovering none.
 *
 * Null means "this is not a backup", which is worth telling the user about.
 * An empty array means "a backup that holds nothing", which is not an error.
 */
export function fromBackup(raw: unknown): LogEntry[] | null {
  if (Array.isArray(raw)) return normalizeEntries(raw);
  if (isRecord(raw) && Array.isArray(raw.entries)) return normalizeEntries(raw.entries);
  return null;
}
