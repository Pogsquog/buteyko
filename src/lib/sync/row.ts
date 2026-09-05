import { LogEntry } from '@/types';
import { normalizeEntry } from '@/lib/session';

/** The `public.buteyko_log_entries` row shape. */
export interface EntryRow {
  user_id: string;
  id: string;
  kind: string;
  timestamp_ms: number;
  payload: unknown;
  client_updated_at: number;
  deleted_at: number | null;
  /** Server clock, written by a trigger. Read-only here; it is the pull cursor. */
  updated_at?: string;
}

export function toRow(entry: LogEntry, userId: string): Omit<EntryRow, 'updated_at'> {
  return {
    user_id: userId,
    id: entry.id,
    kind: entry.kind,
    timestamp_ms: entry.timestamp,
    payload: entry,
    client_updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt,
  };
}

/**
 * Turns a row back into an entry, or returns null if it cannot.
 *
 * The payload goes through `normalizeEntry` exactly like something read from
 * localStorage: it is the one authority on entry shape, it upgrades older
 * shapes, and it rejects anything malformed. A row is not more trustworthy than
 * a stored string just because it came over the wire — it was written by some
 * other version of this app on some other device.
 *
 * The columns win over the payload for the two sync fields, because the columns
 * are what the server ordered and filtered on.
 */
export function fromRow(row: EntryRow): LogEntry | null {
  const entry = normalizeEntry(row.payload);
  if (!entry || entry.id !== row.id) return null;
  return { ...entry, updatedAt: row.client_updated_at, deletedAt: row.deleted_at };
}
