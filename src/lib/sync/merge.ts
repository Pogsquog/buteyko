import { LogEntry } from '@/types';

/**
 * Folds remote entries into the local list.
 *
 * The rules, in full:
 *
 *  - Union by id. An entry present on only one side is kept, never dropped.
 *    This is what makes signing in on a second device safe: two histories that
 *    have never met combine rather than one replacing the other.
 *  - Where both sides hold the same id, the greater `updatedAt` wins.
 *  - On a tie, the remote wins. Ties happen when a device pulls back a row it
 *    pushed itself, where the two are identical anyway; picking a side keeps
 *    the result stable rather than dependent on argument order.
 *  - Tombstones take part on equal terms. A remote tombstone deletes an entry
 *    that is still visible locally, and a local tombstone is not resurrected by
 *    an older remote copy.
 *
 * Pure and order-independent, so it can be tested without a network.
 */
export function mergeEntries(local: LogEntry[], remote: LogEntry[]): LogEntry[] {
  const byId = new Map<string, LogEntry>();
  for (const entry of local) byId.set(entry.id, entry);

  for (const entry of remote) {
    const mine = byId.get(entry.id);
    if (!mine || entry.updatedAt >= mine.updatedAt) byId.set(entry.id, entry);
  }

  // Newest reading first, matching what the history screens expect.
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * The entries this device still owes the server: those whose `updatedAt` is not
 * the one recorded as settled.
 *
 * `settled` is an optimisation and nothing more. If it is lost or wrong the
 * worst case is re-pushing entries that are already there, which the upsert
 * absorbs — so it is never worth protecting at the cost of correctness.
 */
export function pendingEntries(
  local: LogEntry[],
  settled: Record<string, number>,
): LogEntry[] {
  return local.filter(entry => settled[entry.id] !== entry.updatedAt);
}
